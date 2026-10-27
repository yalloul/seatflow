package ma.seatflow.reservation;

import java.security.Principal;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ReservationController {

  private final ReservationService service;

  public ReservationController(ReservationService s) {
    service = s;
  }

  @PostMapping("/holds")
  public ReservationService.HoldResponse hold(
    Principal p,
    @RequestBody ReservationService.HoldRequest r
  ) {
    return service.hold(p.getName(), r);
  }

  @GetMapping("/holds")
  public List<Map<String, Object>> holds(Principal p) {
    return service.activeHolds(p.getName());
  }

  @DeleteMapping("/holds/{token}")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void release(Principal p, @PathVariable UUID token) {
    service.release(p.getName(), token);
  }

  public record ConfirmRequest(UUID holdToken, String paymentResult) {}

  @PostMapping("/orders")
  public Map<String, Object> confirm(
    Principal p,
    @RequestHeader("Idempotency-Key") String key,
    @RequestBody ConfirmRequest r
  ) {
    return service.confirm(p.getName(), r.holdToken(), key, r.paymentResult());
  }

  @GetMapping("/orders")
  public List<Map<String, Object>> orders(Principal p) {
    return service.orders(p.getName());
  }
}
