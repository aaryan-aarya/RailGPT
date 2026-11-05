package com.irctc.irctcbackend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Full-stack integration test against a REAL PostgreSQL (Testcontainers).
 * Exercises the Flyway migrations, JWT auth, roles, ownership, and the booking
 * engine end-to-end over HTTP. Requires a Docker daemon; skipped automatically
 * when Docker is unavailable (see @Testcontainers(disabledWithoutDocker = true)).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker = true)
@ActiveProfiles("integration")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PostgresIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private TestRestTemplate rest;
    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void useJdkHttpClient() {
        // Spring 6.1's SimpleClientHttpRequestFactory always streams request
        // bodies (setOutputStreaming is a deprecated no-op), so the JDK
        // HttpURLConnection cannot read the correct 401 for an unauthenticated
        // POST ("cannot retry due to server authentication, in streaming mode").
        // java.net.http.HttpClient has no such limitation.
        rest.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
    }

    private static final AtomicInteger TRAIN_SEQ = new AtomicInteger(91000);

    private String date() {
        return LocalDate.now().plusDays(7).toString();
    }

    @SuppressWarnings("unchecked")
    private String login(String email, String password) {
        ResponseEntity<Map> resp = rest.postForEntity("/auth/login",
                Map.of("email", email, "password", password), Map.class);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        return (String) resp.getBody().get("token");
    }

    private HttpHeaders auth(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(token);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    /** Admin creates a small train: 2 confirmed, 1 RAC, 2 WL. Returns its number. */
    private String createSmallTrain(String adminToken) {
        String number = String.valueOf(TRAIN_SEQ.incrementAndGet());
        Map<String, Object> body = Map.ofEntries(
                Map.entry("trainNumber", number), Map.entry("trainName", "IT Test Express"),
                Map.entry("source", "New Delhi"), Map.entry("destination", "Amritsar Jn"),
                Map.entry("departureTime", "06:00"), Map.entry("arrivalTime", "12:00"),
                Map.entry("durationMinutes", 360), Map.entry("distanceKm", 450),
                Map.entry("trainType", "Superfast"),
                Map.entry("daysOfRun", List.of("Mon")),
                Map.entry("classes", List.of(Map.of("classType", "SL", "totalSeats", 2, "fare", 100, "racLimit", 1, "waitingLimit", 2))));
        ResponseEntity<Map> resp = rest.exchange("/train/add", HttpMethod.POST,
                new HttpEntity<>(body, auth(adminToken)), Map.class);
        assertEquals(HttpStatus.CREATED, resp.getStatusCode());
        return number;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> book(String token, String trainNumber, int pax) {
        List<Map<String, Object>> passengers = new java.util.ArrayList<>();
        for (int i = 0; i < pax; i++) {
            passengers.add(Map.of("name", "Pax " + (i + 1), "age", 30, "gender", "M"));
        }
        Map<String, Object> body = Map.of("trainNumber", trainNumber, "journeyDate", date(),
                "classType", "SL", "passengers", passengers);
        ResponseEntity<Map> resp = rest.exchange("/booking/book", HttpMethod.POST,
                new HttpEntity<>(body, auth(token)), Map.class);
        assertEquals(HttpStatus.CREATED, resp.getStatusCode());
        return resp.getBody();
    }

    @Test
    @Order(1)
    void flywayMigrationsApplied() {
        Integer applied = jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true", Integer.class);
        assertNotNull(applied);
        assertTrue(applied >= 1, "Flyway should have applied at least one migration");
        // Core tables exist (created by the migration, not by Hibernate).
        Integer tables = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN " +
                        "('users','trains','train_classes','bookings','passengers')", Integer.class);
        assertEquals(5, tables);
    }

    @Test
    @Order(2)
    void registerLoginAndMe() {
        String email = "it-user-" + System.nanoTime() + "@test.app";
        ResponseEntity<Map> reg = rest.postForEntity("/auth/register",
                Map.of("name", "IT User", "email", email, "password", "Password@123"), Map.class);
        assertEquals(HttpStatus.CREATED, reg.getStatusCode());
        assertNotNull(reg.getBody().get("token"));

        String token = login(email, "Password@123");
        ResponseEntity<Map> me = rest.exchange("/auth/me", HttpMethod.GET,
                new HttpEntity<>(auth(token)), Map.class);
        assertEquals(HttpStatus.OK, me.getStatusCode());
        assertEquals(email, ((Map<?, ?>) me.getBody().get("user")).get("email"));
    }

    @Test
    @Order(3)
    void searchReturnsSeededTrains() {
        ResponseEntity<List> resp = rest.getForEntity("/train/search?source=Delhi&destination=Amritsar", List.class);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertFalse(resp.getBody().isEmpty());
    }

    @Test
    @Order(4)
    void bookingConfirmedThenRacThenWlAndPromotionOnCancel() {
        String admin = login("admin@railgpt.app", "Admin@123");
        String user = login("aarav@railgpt.app", "Travel@123");
        String train = createSmallTrain(admin);

        Map<String, Object> confirmed = book(user, train, 2);
        assertEquals("CONFIRMED", confirmed.get("status"));
        assertEquals(10, ((String) confirmed.get("pnr")).length());

        Map<String, Object> rac = book(user, train, 1);
        assertEquals("RAC", rac.get("status"));
        Map<String, Object> wl = book(user, train, 2);
        assertEquals("WL", wl.get("status"));

        // Cancel the confirmed booking -> the RAC passenger is promoted.
        String confirmedPnr = (String) confirmed.get("pnr");
        ResponseEntity<Map> cancel = rest.exchange("/booking/cancel/" + confirmedPnr,
                HttpMethod.DELETE, new HttpEntity<>(auth(user)), Map.class);
        assertEquals(HttpStatus.OK, cancel.getStatusCode());
        assertEquals("CANCELLED", cancel.getBody().get("status"));

        String racPnr = (String) rac.get("pnr");
        ResponseEntity<Map> promoted = rest.exchange("/booking/pnr/" + racPnr,
                HttpMethod.GET, new HttpEntity<>(auth(user)), Map.class);
        assertEquals(HttpStatus.OK, promoted.getStatusCode());
        assertEquals("CONFIRMED", promoted.getBody().get("status"));
    }

    @Test
    @Order(5)
    void nonOwnerCannotCancelAndPublicPnrIsMasked() {
        String admin = login("admin@railgpt.app", "Admin@123");
        String owner = login("aarav@railgpt.app", "Travel@123");
        String train = createSmallTrain(admin);
        Map<String, Object> booking = book(owner, train, 1);
        String pnr = (String) booking.get("pnr");

        // Register a second user and try to cancel the owner's booking.
        String intruderEmail = "it-intruder-" + System.nanoTime() + "@test.app";
        rest.postForEntity("/auth/register",
                Map.of("name", "Intruder", "email", intruderEmail, "password", "Password@123"), Map.class);
        String intruder = login(intruderEmail, "Password@123");
        ResponseEntity<Map> forbidden = rest.exchange("/booking/cancel/" + pnr,
                HttpMethod.DELETE, new HttpEntity<>(auth(intruder)), Map.class);
        assertEquals(HttpStatus.FORBIDDEN, forbidden.getStatusCode());

        // Public (unauthenticated) PNR lookup masks the passenger name + hides email.
        ResponseEntity<Map> publicView = rest.getForEntity("/booking/pnr/" + pnr, Map.class);
        assertEquals(HttpStatus.OK, publicView.getStatusCode());
        assertNull(publicView.getBody().get("userEmail"));
        List<Map<String, Object>> pax = (List<Map<String, Object>>) publicView.getBody().get("passengers");
        assertNotEquals("Pax 1", pax.get(0).get("name"));
    }

    @Test
    @Order(6)
    void onlyAdminCanManageTrains() {
        String user = login("aarav@railgpt.app", "Travel@123");
        Map<String, Object> body = Map.of(
                "trainNumber", "92999", "trainName", "X", "source", "A", "destination", "B",
                "classes", List.of(Map.of("classType", "SL", "totalSeats", 1, "fare", 1, "racLimit", 0, "waitingLimit", 0)));
        ResponseEntity<Map> asUser = rest.exchange("/train/add", HttpMethod.POST,
                new HttpEntity<>(body, auth(user)), Map.class);
        assertEquals(HttpStatus.FORBIDDEN, asUser.getStatusCode());

        String admin = login("admin@railgpt.app", "Admin@123");
        ResponseEntity<Map> asAdmin = rest.exchange("/train/add", HttpMethod.POST,
                new HttpEntity<>(body, auth(admin)), Map.class);
        assertEquals(HttpStatus.CREATED, asAdmin.getStatusCode());
    }

    @Test
    @Order(7)
    void unauthenticatedBookingIsRejected() {
        Map<String, Object> body = Map.of("trainNumber", "12497", "journeyDate", date(),
                "classType", "SL", "passengers", List.of(Map.of("name", "Pax 1", "age", 30, "gender", "M")));
        ResponseEntity<Map> resp = rest.postForEntity("/booking/book", body, Map.class);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }
}
