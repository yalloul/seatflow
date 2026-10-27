package ma.seatflow.seasonpass;

import java.security.Principal;
import java.util.*;
import ma.seatflow.shared.ApiError.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class PassController {

  private final JdbcTemplate db;

  public PassController(JdbcTemplate d) {
    db = d;
  }

  private long user(String name) {
    return db.queryForObject(
      "SELECT id FROM app_user WHERE username=?",
      Long.class,
      name
    );
  }

  @GetMapping("/passes")
  public List<Map<String, Object>> mine(Principal p) {
    return db.queryForList(
      "SELECT sp.id,sp.season_id,s.name,sp.type,sp.seat_id,(SELECT count(*) FROM season_seat_assignment WHERE pass_id=sp.id) AS events FROM season_pass sp JOIN season s ON s.id=sp.season_id WHERE sp.owner_id=?",
      user(p.getName())
    );
  }

  public record PassRequest(long seasonId, String type, Long seatId) {}

  @Transactional
  @PostMapping("/passes")
  public Map<String, Object> buy(Principal p, @RequestBody PassRequest r) {
    if (
      r.type() == null || !List.of("FIXED", "PRIORITY").contains(r.type())
    ) throw new Bad("Formule invalide");
    long owner = user(p.getName());
    db.queryForMap("SELECT id FROM season WHERE id=? FOR UPDATE", r.seasonId());
    if (
      db.queryForObject(
        "SELECT EXISTS(SELECT 1 FROM season_pass WHERE owner_id=? AND season_id=? AND type=?)",
        Boolean.class,
        owner,
        r.seasonId(),
        r.type()
      )
    ) throw new Conflict("Vous possédez déjà cette formule pour la saison");
    if ("FIXED".equals(r.type())) {
      if (r.seatId() == null) throw new Bad("Place requise");
      db.queryForMap("SELECT id FROM seat WHERE id=? FOR UPDATE", r.seatId());
      var seats = db.queryForList(
        "SELECT es.id,es.status,e.id AS event_id FROM event_seat es JOIN event e ON e.id=es.event_id WHERE e.season_id=? AND es.seat_id=? AND e.status='PUBLISHED' ORDER BY es.id FOR UPDATE OF es",
        r.seasonId(),
        r.seatId()
      );
      if (
        seats.isEmpty() ||
        seats.stream().anyMatch(s -> !"AVAILABLE".equals(s.get("status")))
      ) throw new Conflict("Place indisponible sur un événement de la saison");
      for (var s : seats) {
        long active = db.queryForObject(
          "SELECT count(*) FROM seat_hold WHERE event_seat_id=? AND status='ACTIVE' AND expires_at>now()",
          Long.class,
          s.get("id")
        );
        if (active > 0) throw new Conflict(
          "Place temporairement bloquée sur un événement de la saison"
        );
      }
      long pass = db.queryForObject(
        "INSERT INTO season_pass(season_id,owner_id,type,seat_id) VALUES(?,?,'FIXED',?) RETURNING id",
        Long.class,
        r.seasonId(),
        owner,
        r.seatId()
      );
      for (var s : seats) {
        db.update(
          "UPDATE event_seat SET status='PASS',pass_owner=? WHERE id=?",
          owner,
          s.get("id")
        );
        db.update(
          "INSERT INTO season_seat_assignment(pass_id,event_id,event_seat_id) VALUES(?,?,?)",
          pass,
          s.get("event_id"),
          s.get("id")
        );
        db.update(
          "INSERT INTO ticket(event_seat_id,event_id,owner_id,code,status) VALUES(?,?,?,gen_random_uuid(),'ACTIVE')",
          s.get("id"),
          s.get("event_id"),
          owner
        );
      }
      db.update(
        "INSERT INTO audit_entry(actor_id,action,entity_type,entity_id) VALUES(?,'PASS_FIXED','SEASON_PASS',?)",
        owner,
        pass
      );
      return Map.of("id", pass, "type", "FIXED");
    }
    long pass = db.queryForObject(
      "INSERT INTO season_pass(season_id,owner_id,type) VALUES(?,?,'PRIORITY') RETURNING id",
      Long.class,
      r.seasonId(),
      owner
    );
    db.update(
      "INSERT INTO audit_entry(actor_id,action,entity_type,entity_id) VALUES(?,'PASS_PRIORITY','SEASON_PASS',?)",
      owner,
      pass
    );
    return Map.of("id", pass, "type", "PRIORITY");
  }
}
