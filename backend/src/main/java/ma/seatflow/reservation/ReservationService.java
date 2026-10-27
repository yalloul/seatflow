package ma.seatflow.reservation;

import ma.seatflow.shared.ApiError.Bad;
import ma.seatflow.shared.ApiError.Conflict;
import ma.seatflow.shared.StreamHub;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class ReservationService {
    private final JdbcTemplate db;
    private final StreamHub hub;

    public ReservationService(JdbcTemplate db, StreamHub hub) { this.db = db; this.hub = hub; }
    public record HoldRequest(long eventId, List<Long> seatIds) {}
    public record HoldResponse(UUID token, Instant expiresAt, BigDecimal total) {}

    private long user(String username) {
        return db.queryForObject("SELECT id FROM app_user WHERE username=?", Long.class, username);
    }
    private Instant databaseTime() {
        // clock_timestamp() advances while a transaction is waiting for a seat lock.
        return db.queryForObject("SELECT clock_timestamp()", Timestamp.class).toInstant();
    }
    private void changedAfterCommit(long eventId) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { hub.changed(eventId); }
        });
    }

    @Transactional
    public HoldResponse hold(String username, HoldRequest request) {
        if (request.seatIds() == null || request.seatIds().isEmpty() || request.seatIds().size() > 8
                || request.seatIds().stream().anyMatch(Objects::isNull) || new HashSet<>(request.seatIds()).size() != request.seatIds().size()) {
            throw new Bad("Choisissez entre 1 et 8 places distinctes");
        }
        long owner = user(username);
        var event = db.queryForMap("SELECT status,starts_at,public_opens_at,priority_opens_at,season_id FROM event WHERE id=?", request.eventId());
        var now = databaseTime();
        if (!"PUBLISHED".equals(event.get("status")) || !now.isBefore(((Timestamp) event.get("starts_at")).toInstant())) {
            throw new Conflict("Événement indisponible");
        }
        if (now.isBefore(((Timestamp) event.get("public_opens_at")).toInstant())) {
            boolean priority = db.queryForObject("SELECT EXISTS(SELECT 1 FROM season_pass WHERE owner_id=? AND season_id=? AND type='PRIORITY')",
                Boolean.class, owner, event.get("season_id"));
            var opening = (Timestamp) event.get("priority_opens_at");
            if (!priority || opening == null || now.isBefore(opening.toInstant())) {
                throw new Conflict("La réservation n'est pas encore ouverte pour ce compte");
            }
        }
        var ids = new ArrayList<>(request.seatIds());
        Collections.sort(ids);
        var seats = new ArrayList<Map<String, Object>>();
        for (long id : ids) {
            seats.add(db.queryForMap("SELECT id,event_id,status,price FROM event_seat WHERE id=? FOR UPDATE", id));
        }
        // All locks have now been acquired; a slow competing request cannot extend a lease.
        now = databaseTime();
        Instant expiry = now.plus(Duration.ofMinutes(10));
        UUID token = UUID.randomUUID();
        BigDecimal total = BigDecimal.ZERO;
        for (var seat : seats) {
            long id = ((Number) seat.get("id")).longValue();
            if (((Number) seat.get("event_id")).longValue() != request.eventId() || !"AVAILABLE".equals(seat.get("status"))) {
                throw new Conflict("Une place est indisponible ; aucune place n'a été bloquée");
            }
            db.update("UPDATE seat_hold SET status='EXPIRED' WHERE event_seat_id=? AND status='ACTIVE' AND expires_at<=clock_timestamp()", id);
            boolean held = db.queryForObject("SELECT EXISTS(SELECT 1 FROM seat_hold WHERE event_seat_id=? AND status='ACTIVE')", Boolean.class, id);
            if (held) throw new Conflict("Une place est déjà bloquée ; aucune place n'a été bloquée");
            total = total.add((BigDecimal) seat.get("price"));
            db.update("INSERT INTO seat_hold(event_seat_id,owner_id,token,expires_at,status) VALUES(?,?,?,?,'ACTIVE')",
                id, owner, token, Timestamp.from(expiry));
            audit(owner, "HOLD", id);
        }
        changedAfterCommit(request.eventId());
        return new HoldResponse(token, expiry, total);
    }

    @Transactional
    public Map<String, Object> confirm(String username, UUID token, String key, String result) {
        if (token == null || !List.of("success", "decline").contains(result == null ? "" : result)) {
            throw new Bad("Blocage et résultat de paiement valides requis");
        }
        if (key == null || key.isBlank() || key.length() > 120) throw new Bad("Clé d'idempotence requise");
        long owner = user(username);
        // Serialize retries from one account. Different accounts retain independent locks.
        db.queryForMap("SELECT id FROM app_user WHERE id=? FOR UPDATE", owner);
        var existing = db.queryForList("SELECT id,status,total,hold_token,payment_result FROM customer_order WHERE owner_id=? AND idempotency_key=?", owner, key);
        if (!existing.isEmpty()) {
            var order = existing.get(0);
            if (!token.equals(order.get("hold_token")) || !result.equals(order.get("payment_result"))) {
                throw new Conflict("Cette clé d’idempotence correspond à une autre demande");
            }
            return Map.of("id", order.get("id"), "status", order.get("status"), "total", order.get("total"));
        }
        var holds = db.queryForList("""
            SELECT sh.id,sh.event_seat_id,sh.expires_at,es.event_id,es.price
            FROM seat_hold sh JOIN event_seat es ON es.id=sh.event_seat_id
            WHERE sh.token=? AND sh.owner_id=? AND sh.status='ACTIVE' ORDER BY sh.event_seat_id
            """, token, owner);
        if (holds.isEmpty()) throw new Conflict("Blocage expiré ou introuvable");
        long eventId = ((Number) holds.get(0).get("event_id")).longValue();
        for (var hold : holds) {
            var seat = db.queryForMap("SELECT status FROM event_seat WHERE id=? FOR UPDATE", hold.get("event_seat_id"));
            boolean active = db.queryForObject("SELECT status='ACTIVE' FROM seat_hold WHERE id=?", Boolean.class, hold.get("id"));
            if (!active || !"AVAILABLE".equals(seat.get("status"))) throw new Conflict("Blocage terminé ou place devenue indisponible");
        }
        // Recheck expiration after every seat lock has been acquired.
        var now = databaseTime();
        if (holds.stream().anyMatch(hold -> !((Timestamp) hold.get("expires_at")).toInstant().isAfter(now))) {
            throw new Conflict("Blocage expiré");
        }
        if (!"PUBLISHED".equals(db.queryForObject("SELECT status FROM event WHERE id=?", String.class, eventId))) {
            throw new Conflict("Événement indisponible");
        }
        BigDecimal total = holds.stream().map(hold -> (BigDecimal) hold.get("price")).reduce(BigDecimal.ZERO, BigDecimal::add);
        String state = "success".equals(result) ? "PAID" : "DECLINED";
        long order = db.queryForObject("""
            INSERT INTO customer_order(owner_id,event_id,hold_token,idempotency_key,status,total,payment_result)
            VALUES(?,?,?,?,?,?,?) RETURNING id
            """, Long.class, owner, eventId, token, key, state, total, result);
        db.update("INSERT INTO payment_attempt(order_id,result,external_key) VALUES(?,?,?)", order, state, UUID.randomUUID().toString());
        for (var hold : holds) {
            long seat = ((Number) hold.get("event_seat_id")).longValue();
            db.update("UPDATE seat_hold SET status='CONSUMED' WHERE id=?", hold.get("id"));
            if ("PAID".equals(state)) {
                db.update("UPDATE event_seat SET status='SOLD' WHERE id=?", seat);
                long item = db.queryForObject("INSERT INTO order_item(order_id,event_seat_id,price) VALUES(?,?,?) RETURNING id",
                    Long.class, order, seat, hold.get("price"));
                db.update("INSERT INTO ticket(order_item_id,event_seat_id,event_id,owner_id,code,status) VALUES(?,?,?,?,?,'ACTIVE')",
                    item, seat, eventId, owner, UUID.randomUUID());
            }
            audit(owner, state, seat);
        }
        changedAfterCommit(eventId);
        return Map.of("id", order, "status", state, "total", total);
    }

    public List<Map<String, Object>> activeHolds(String username) {
        return db.query("""
            SELECT sh.token,es.event_id,e.title,max(sh.expires_at) AS expires_at,sum(es.price) AS total,
                   array_agg(es.id ORDER BY es.id) AS seat_ids
            FROM seat_hold sh JOIN event_seat es ON es.id=sh.event_seat_id JOIN event e ON e.id=es.event_id
            WHERE sh.owner_id=? AND sh.status='ACTIVE' AND sh.expires_at>clock_timestamp()
            GROUP BY sh.token,es.event_id,e.title ORDER BY max(sh.expires_at)
            """, (rs, row) -> {
            var ids = rs.getArray("seat_ids");
            try {
                return Map.<String, Object>of("token", rs.getObject("token"), "event_id", rs.getLong("event_id"),
                    "title", rs.getString("title"), "expires_at", rs.getTimestamp("expires_at"),
                    "total", rs.getBigDecimal("total"), "seat_ids", ids.getArray());
            } finally { ids.free(); }
        }, user(username));
    }

    @Transactional
    public void release(String username, UUID token) {
        long owner = user(username);
        var seats = db.queryForList("""
            SELECT sh.event_seat_id,es.event_id FROM seat_hold sh JOIN event_seat es ON es.id=sh.event_seat_id
            WHERE sh.token=? AND sh.owner_id=? AND sh.status='ACTIVE' ORDER BY sh.event_seat_id
            """, token, owner);
        if (seats.isEmpty()) throw new Conflict("Blocage introuvable ou déjà terminé");
        for (var seat : seats) db.queryForMap("SELECT id FROM event_seat WHERE id=? FOR UPDATE", seat.get("event_seat_id"));
        int released = db.update("UPDATE seat_hold SET status='RELEASED' WHERE token=? AND owner_id=? AND status='ACTIVE'", token, owner);
        if (released == 0) throw new Conflict("Blocage déjà terminé");
        for (var seat : seats) audit(owner, "HOLD_RELEASE", ((Number) seat.get("event_seat_id")).longValue());
        changedAfterCommit(((Number) seats.get(0).get("event_id")).longValue());
    }

    public List<Map<String, Object>> orders(String username) {
        return db.queryForList("SELECT id,event_id,status,total,created_at FROM customer_order WHERE owner_id=? ORDER BY id DESC", user(username));
    }
    private void audit(long owner, String action, long seat) {
        db.update("INSERT INTO audit_entry(actor_id,action,entity_type,entity_id) VALUES(?,?,'EVENT_SEAT',?)", owner, action, seat);
    }
}
