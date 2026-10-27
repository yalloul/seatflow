package ma.seatflow;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.util.UUID;
import ma.seatflow.reservation.ReservationService;
import ma.seatflow.shared.ApiError.Bad;
import ma.seatflow.shared.ApiError.Conflict;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
class AngularWorkflowTest {

  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
    "postgres:16-alpine"
  );

  static {
    postgres.start();
  }

  @DynamicPropertySource
  static void props(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }

  @Autowired
  MockMvc mvc;

  @Autowired
  ReservationService service;

  @Autowired
  JdbcTemplate db;

  @Autowired
  ma.seatflow.event.AdminController admin;

  long seat(int number) {
    return db.queryForObject(
      "SELECT id FROM event_seat WHERE event_id=1 AND seat_id=?",
      Long.class,
      number
    );
  }

  @Test
  void loginVerifiesPasswordAndCreatesSession() throws Exception {
    mvc
      .perform(
        post("/api/auth/login")
          .with(csrf())
          .param("username", "client")
          .param("password", "wrong")
      )
      .andExpect(status().isUnauthorized());
    var result = mvc
      .perform(
        post("/api/auth/login")
          .with(csrf())
          .param("username", "client")
          .param("password", "demo1234")
      )
      .andExpect(status().isOk())
      .andReturn();
    var session = (MockHttpSession) result.getRequest().getSession(false);
    assertNotNull(session);
    mvc
      .perform(get("/api/auth/me").session(session))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.username").value("client"))
      .andExpect(jsonPath("$.roles[0]").value("CLIENT"));
    mvc
      .perform(post("/api/auth/logout").session(session).with(csrf()))
      .andExpect(status().isNoContent());
    assertTrue(session.isInvalid());
  }

  @Test
  void csrfAndRolesAreEnforced() throws Exception {
    mvc
      .perform(
        post("/api/holds")
          .with(user("client").roles("CLIENT"))
          .contentType("application/json")
          .content("{\"eventId\":1,\"seatIds\":[8]}")
      )
      .andExpect(status().isForbidden());
    mvc
      .perform(get("/api/admin/report").with(user("client").roles("CLIENT")))
      .andExpect(status().isForbidden());
    mvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
    mvc
      .perform(
        post("/api/holds")
          .with(user("controleur").roles("CHECKER"))
          .with(csrf())
          .contentType("application/json")
          .content("{\"eventId\":1,\"seatIds\":[8]}")
      )
      .andExpect(status().isForbidden());
  }

  @Test
  void releasedHoldCanBeBookedAgainAndCannotBePaid() {
    long seat = seat(8);
    var hold = service.hold(
      "client",
      new ReservationService.HoldRequest(1, List.of(seat))
    );
    service.release("client", hold.token());
    assertEquals(
      "RELEASED",
      db.queryForObject(
        "SELECT status FROM seat_hold WHERE token=?",
        String.class,
        hold.token()
      )
    );
    assertThrows(Conflict.class, () ->
      service.confirm(
        "client",
        hold.token(),
        UUID.randomUUID().toString(),
        "success"
      )
    );
    assertNotNull(
      service.hold(
        "abonne",
        new ReservationService.HoldRequest(1, List.of(seat))
      )
    );
  }

  @Test
  void anotherUserCannotReleaseOrConfirmHold() throws Exception {
    var hold = service.hold(
      "client",
      new ReservationService.HoldRequest(1, List.of(seat(9)))
    );
    assertThrows(Conflict.class, () -> service.release("abonne", hold.token()));
    assertThrows(Conflict.class, () ->
      service.confirm(
        "abonne",
        hold.token(),
        UUID.randomUUID().toString(),
        "success"
      )
    );
    assertFalse(service.activeHolds("client").isEmpty());
    mvc
      .perform(get("/api/holds").with(user("client").roles("CLIENT")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[0].seat_ids").isArray());
  }

  @Test
  void retryReturnsOneOrderAndChangedRequestIsRejected() {
    long seat = seat(10);
    var hold = service.hold(
      "client",
      new ReservationService.HoldRequest(1, List.of(seat))
    );
    String key = UUID.randomUUID().toString();
    var first = service.confirm("client", hold.token(), key, "success");
    assertEquals(
      first,
      service.confirm("client", hold.token(), key, "success")
    );
    assertThrows(Conflict.class, () ->
      service.confirm("client", hold.token(), key, "decline")
    );
    assertThrows(Conflict.class, () ->
      service.confirm("client", UUID.randomUUID(), key, "success")
    );
    assertEquals(
      1L,
      db.queryForObject(
        "SELECT count(*) FROM ticket WHERE event_seat_id=?",
        Long.class,
        seat
      )
    );
  }

  @Test
  void invalidPaymentDoesNotConsumeHold() {
    var hold = service.hold(
      "client",
      new ReservationService.HoldRequest(1, List.of(seat(11)))
    );
    assertThrows(Bad.class, () ->
      service.confirm("client", hold.token(), "invalid-payment", "anything")
    );
    assertEquals(
      "ACTIVE",
      db.queryForObject(
        "SELECT status FROM seat_hold WHERE token=?",
        String.class,
        hold.token()
      )
    );
  }

  @Test
  void eventsHavePersistentImagesAndMissingEventReturns404() throws Exception {
    mvc
      .perform(get("/api/events"))
      .andExpect(status().isOk())
      .andExpect(
        jsonPath("$[0].image_path").value("/images/symphonie-atlas.png")
      );
    mvc.perform(get("/api/events/999999")).andExpect(status().isNotFound());
    mvc.perform(get("/api/seasons/1/seats")).andExpect(status().isOk());
  }

  @Test
  void invalidEventCreationReturns400() throws Exception {
    mvc
      .perform(
        post("/api/admin/events")
          .with(user("organisateur").roles("ORGANIZER"))
          .with(csrf())
          .contentType("application/json")
          .content("{\"hallId\":1,\"title\":\"\"}")
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void lateEventsRespectHallEligibilityAndIssueSubscriberTickets() {
    var start = java.time.Instant.parse("2027-09-10T19:00:00Z");
    var end = start.plusSeconds(7200);
    var opening = java.time.Instant.parse("2026-01-01T00:00:00Z");
    var first = admin.create(
      () -> "organisateur",
      new ma.seatflow.event.AdminController.NewEvent(
        1,
        1L,
        "Nouvel événement Atlas",
        "Test",
        start,
        end,
        60,
        30,
        null,
        opening
      )
    );
    long event = ((Number) first.get("id")).longValue();
    assertEquals(
      1L,
      db.queryForObject(
        "SELECT count(*) FROM ticket WHERE event_id=? AND owner_id=2",
        Long.class,
        event
      )
    );
    var second = admin.create(
      () -> "organisateur",
      new ma.seatflow.event.AdminController.NewEvent(
        2,
        1L,
        "Nouvel événement Horizon",
        "Test",
        start,
        end,
        60,
        30,
        null,
        opening
      )
    );
    assertNotNull(second.get("id"));
    assertEquals(
      0L,
      db.queryForObject(
        "SELECT count(*) FROM ticket WHERE event_id=? AND owner_id=2",
        Long.class,
        second.get("id")
      )
    );
  }
}
