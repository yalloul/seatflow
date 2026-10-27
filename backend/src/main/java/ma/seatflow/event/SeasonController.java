package ma.seatflow.event;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/seasons")
public class SeasonController {

  private final JdbcTemplate db;

  public SeasonController(JdbcTemplate db) {
    this.db = db;
  }

  @GetMapping
  public List<Map<String, Object>> all() {
    return db.queryForList(
      "SELECT id,name,starts_on,ends_on FROM season ORDER BY starts_on"
    );
  }

  @GetMapping("/{id}/seats")
  public List<Map<String, Object>> seats(@PathVariable long id) {
    return db.queryForList(
      """
      SELECT s.id,s.row_label,s.number,h.name AS hall
      FROM seat s JOIN hall h ON h.id=s.hall_id
      WHERE EXISTS (SELECT 1 FROM event e WHERE e.hall_id=h.id AND e.season_id=? AND e.status='PUBLISHED')
      AND NOT EXISTS (
          SELECT 1 FROM event_seat es JOIN event e ON e.id=es.event_id
          WHERE es.seat_id=s.id AND e.season_id=? AND e.status='PUBLISHED'
          AND (es.status<>'AVAILABLE' OR EXISTS (
              SELECT 1 FROM seat_hold sh WHERE sh.event_seat_id=es.id
              AND sh.status='ACTIVE' AND sh.expires_at>now())))
      ORDER BY s.id
      """,
      id,
      id
    );
  }
}
