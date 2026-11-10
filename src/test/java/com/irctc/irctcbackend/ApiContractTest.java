package com.irctc.irctcbackend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.irctc.irctcbackend.email.EmailService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:apicontract;DB_CLOSE_DELAY=-1;MODE=PostgreSQL"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiContractTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    // Prevent real Gmail calls during automated tests.
    @MockBean
    private EmailService emailService;

    private static final AtomicInteger TRAIN_SEQ = new AtomicInteger(96000);

    private String date() {
        return LocalDate.now().plusDays(7).toString();
    }

    private String body(Object o) throws Exception {
        return json.writeValueAsString(o);
    }

    // -------------------------------------------------------------
    // Authentication helpers
    // -------------------------------------------------------------

    /** Log in with a seeded account and return a real JWT. */
    private String token(String email, String password) throws Exception {

        MvcResult res = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "email", email,
                                "password", password
                        ))))
                .andExpect(status().isOk())
                .andReturn();

        return json.readTree(
                res.getResponse().getContentAsString()
        ).get("token").asText();
    }

    private String userToken() throws Exception {
        return token("aarav@railgpt.app", "Travel@123");
    }

    private String adminToken() throws Exception {
        return token("admin@railgpt.app", "Admin@123");
    }

    /**
     * Start registration and capture the OTP from the mocked EmailService.
     * No real email is sent.
     */
    private String startRegistrationAndGetOtp(
            String email,
            Map<String, Object> registrationPayload
    ) throws Exception {

        // Reset previous mock invocations for this registration.
        clearInvocations(emailService);

        mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(registrationPayload)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").isString())
                .andExpect(jsonPath("$.email", is(email.toLowerCase())));

        ArgumentCaptor<String> otpCaptor =
                ArgumentCaptor.forClass(String.class);

        verify(emailService).sendRegistrationOtp(
                eq(email.toLowerCase()),
                otpCaptor.capture()
        );

        return otpCaptor.getValue();
    }

    /** Verify OTP and return the JWT issued after account creation. */
    private String verifyOtpAndGetToken(
            String email,
            String otp
    ) throws Exception {

        MvcResult result = mvc.perform(post("/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "email", email,
                                "otp", otp
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        return json.readTree(
                result.getResponse().getContentAsString()
        ).get("token").asText();
    }

    /** Register a unique user, verify OTP and return its JWT. */
    private String registerUser() throws Exception {

        String email = "contract-" + System.nanoTime() + "@test.app";

        return registerUser(email);
    }

    /** Register a user with a supplied email and return its JWT. */
    private String registerUser(String email) throws Exception {

        Map<String, Object> payload = Map.of(
                "name", "Contract User",
                "email", email,
                "password", "Password@123"
        );

        String otp = startRegistrationAndGetOtp(email, payload);

        return verifyOtpAndGetToken(email, otp);
    }

    // -------------------------------------------------------------
    // Train and booking helpers
    // -------------------------------------------------------------

    /** Admin creates a small train (2 confirmed, 1 RAC, 2 WL). */
    private String smallTrain() throws Exception {

        String number = String.valueOf(TRAIN_SEQ.incrementAndGet());

        Map<String, Object> payload = Map.ofEntries(
                Map.entry("trainNumber", number),
                Map.entry("trainName", "Contract Express"),
                Map.entry("source", "New Delhi"),
                Map.entry("destination", "Amritsar Jn"),
                Map.entry("departureTime", "06:00"),
                Map.entry("arrivalTime", "12:00"),
                Map.entry("durationMinutes", 360),
                Map.entry("distanceKm", 450),
                Map.entry("trainType", "Superfast"),
                Map.entry("daysOfRun", List.of("Mon")),
                Map.entry("classes", List.of(
                        Map.of(
                                "classType", "SL",
                                "totalSeats", 2,
                                "fare", 100,
                                "racLimit", 1,
                                "waitingLimit", 2
                        )
                ))
        );

        mvc.perform(post("/train/add")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(payload)))
                .andExpect(status().isCreated());

        return number;
    }

    private Map<String, Object> bookPayload(String train, int pax) {

        List<Map<String, Object>> passengers = new java.util.ArrayList<>();

        for (int i = 0; i < pax; i++) {
            passengers.add(Map.of(
                    "name", "Pax " + (i + 1),
                    "age", 30,
                    "gender", "M"
            ));
        }

        return Map.of(
                "trainNumber", train,
                "journeyDate", date(),
                "classType", "SL",
                "passengers", passengers
        );
    }

    private JsonNode book(String token, String train, int pax)
            throws Exception {

        MvcResult res = mvc.perform(post("/booking/book")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(bookPayload(train, pax))))
                .andExpect(status().isCreated())
                .andReturn();

        return json.readTree(
                res.getResponse().getContentAsString()
        );
    }

    // -------------------------------------------------------------
    // Meta / stations
    // -------------------------------------------------------------

    @Test
    void metaShape() throws Exception {

        mvc.perform(get("/meta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode", is("production")))
                .andExpect(jsonPath("$.name").isString())
                .andExpect(jsonPath("$.version").isString())
                .andExpect(jsonPath("$.disclaimer").isString())
                .andExpect(jsonPath("$.stations").isNumber())
                .andExpect(jsonPath("$.trains").isNumber());
    }

    @Test
    void healthShape() throws Exception {

        mvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ok")));
    }

    @Test
    void stationsShapeAndSearch() throws Exception {

        mvc.perform(get("/stations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                .andExpect(jsonPath("$[0].code").isString())
                .andExpect(jsonPath("$[0].name").isString())
                .andExpect(jsonPath("$[0].city").isString())
                .andExpect(jsonPath("$[0].state").isString());

        mvc.perform(get("/stations").param("q", "del"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // -------------------------------------------------------------
    // Authentication
    // -------------------------------------------------------------

    @Test
    void registerReturnsSessionAndCookieWithoutPassword()
            throws Exception {

        String email = "reg-" + System.nanoTime() + "@test.app";

        Map<String, Object> payload = Map.of(
                "name", "Reg User",
                "email", email,
                "password", "Password@123",
                "phone", "9999999999"
        );

        // Step 1: Register and capture OTP.
        String otp = startRegistrationAndGetOtp(email, payload);

        // Step 2: Verify OTP and obtain the session.
        MvcResult result = mvc.perform(post("/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "email", email,
                                "otp", otp
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.expiresIn").isNumber())
                .andExpect(jsonPath("$.user.id").isNumber())
                .andExpect(jsonPath("$.user.email", is(email)))
                .andExpect(jsonPath("$.user.role", is("USER")))
                .andExpect(jsonPath("$.user.password").doesNotExist())
                .andExpect(cookie().exists("token"))
                .andExpect(cookie().httpOnly("token", true))
                .andReturn();

        // Confirm that the JWT is present in the response.
        String responseBody = result.getResponse().getContentAsString();

        JsonNode responseJson = json.readTree(responseBody);

        org.junit.jupiter.api.Assertions.assertTrue(
                responseJson.get("token").asText().length() > 0
        );
    }

    @Test
    void registerValidationAndDuplicate() throws Exception {

        mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "name", "x",
                                "email", "bad",
                                "password", "short"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION")))
                .andExpect(jsonPath("$.message").isString());

        mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "name", "Dup User",
                                "email", "aarav@railgpt.app",
                                "password", "Password@123"
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("EMAIL_EXISTS")));
    }

    @Test
    void loginShapeAndBadCredentials() throws Exception {

        mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "email", "aarav@railgpt.app",
                                "password", "Travel@123"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.expiresIn").isNumber())
                .andExpect(jsonPath("$.user.email", is("aarav@railgpt.app")))
                .andExpect(jsonPath("$.user.password").doesNotExist());

        mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "email", "aarav@railgpt.app",
                                "password", "wrong"
                        ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("INVALID_CREDENTIALS")));
    }

    @Test
    void meRequiresAuthAndAcceptsBearerAndCookie() throws Exception {

        mvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));

        MvcResult login = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "email", "aarav@railgpt.app",
                                "password", "Travel@123"
                        ))))
                .andExpect(status().isOk())
                .andReturn();

        String tok = json.readTree(
                login.getResponse().getContentAsString()
        ).get("token").asText();

        Cookie cookie = login.getResponse().getCookie("token");

        mvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + tok))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email", is("aarav@railgpt.app")));

        mvc.perform(get("/auth/me").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email", is("aarav@railgpt.app")));
    }

    @Test
    void logoutClearsCookie() throws Exception {

        mvc.perform(post("/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok", is(true)))
                .andExpect(cookie().maxAge("token", 0));
    }

    // -------------------------------------------------------------
    // Profile
    // -------------------------------------------------------------

    @Test
    void profileGetAndPatch() throws Exception {

        String tok = registerUser();

        mvc.perform(get("/user/profile")
                        .header("Authorization", "Bearer " + tok))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").isString());

        mvc.perform(patch("/user/profile")
                        .header("Authorization", "Bearer " + tok)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "name", "Renamed User",
                                "phone", "8888888888"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.name", is("Renamed User")))
                .andExpect(jsonPath("$.user.phone", is("8888888888")));

        mvc.perform(patch("/user/profile")
                        .header("Authorization", "Bearer " + tok)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("name", "x"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION")));
    }

    @Test
    void changePasswordFlow() throws Exception {

        String email = "pw-" + System.nanoTime() + "@test.app";

        // Registration now includes OTP verification.
        String tok = registerUser(email);

        mvc.perform(post("/user/change-password")
                        .header("Authorization", "Bearer " + tok)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "currentPassword", "wrong",
                                "newPassword", "NewPassword@123"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION")));

        mvc.perform(post("/user/change-password")
                        .header("Authorization", "Bearer " + tok)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "currentPassword", "Password@123",
                                "newPassword", "NewPassword@123"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok", is(true)));

        token(email, "NewPassword@123");
    }

    // -------------------------------------------------------------
    // Trains
    // -------------------------------------------------------------

    @Test
    void trainReadsArePublicWithContractShape() throws Exception {

        mvc.perform(get("/train/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                .andExpect(jsonPath("$[0].id").isNumber())
                .andExpect(jsonPath("$[0].trainNumber").isString())
                .andExpect(jsonPath("$[0].classes").isArray())
                .andExpect(jsonPath("$[0].classes[0].classType").isString())
                .andExpect(jsonPath("$[0].classes[0].totalSeats").isNumber())
                .andExpect(jsonPath("$[0].classes[0].fare").isNumber());

        mvc.perform(get("/train/search")
                        .param("source", "Delhi")
                        .param("destination", "Amritsar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void trainDetailIncludesClassAvailability() throws Exception {

        String number = smallTrain();

        String[] paths = {
                "/train/" + number,
                "/train/seats/" + number
        };

        for (String path : paths) {

            mvc.perform(get(path).param("date", date()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.trainNumber", is(number)))
                    .andExpect(jsonPath("$.availability.SL.classType", is("SL")))
                    .andExpect(jsonPath("$.availability.SL.totalSeats").isNumber())
                    .andExpect(jsonPath("$.availability.SL.availableSeats").isNumber())
                    .andExpect(jsonPath("$.availability.SL.confirmedCount").isNumber())
                    .andExpect(jsonPath("$.availability.SL.racAvailable").isNumber())
                    .andExpect(jsonPath("$.availability.SL.waitingAvailable").isNumber())
                    .andExpect(jsonPath("$.availability.SL.status", is("AVAILABLE")));
        }
    }

    @Test
    void unknownTrainIs404WithErrorShape() throws Exception {

        mvc.perform(get("/train/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code", is("TRAIN_NOT_FOUND")))
                .andExpect(jsonPath("$.message").isString());
    }

    @Test
    void trainWritesAreAdminOnly() throws Exception {

        Map<String, Object> payload = Map.of(
                "trainNumber", "96999",
                "trainName", "X",
                "source", "A",
                "destination", "B",
                "classes", List.of(
                        Map.of(
                                "classType", "SL",
                                "totalSeats", 1,
                                "fare", 1,
                                "racLimit", 0,
                                "waitingLimit", 0
                        )
                )
        );

        mvc.perform(post("/train/add")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(payload)))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/train/add")
                        .header("Authorization", "Bearer " + userToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(payload)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("FORBIDDEN")));

        mvc.perform(post("/train/add")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.trainNumber", is("96999")));
    }

    @Test
    void trainAddValidation() throws Exception {

        mvc.perform(post("/train/add")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "trainNumber", "1",
                                "trainName", "",
                                "source", "",
                                "destination", ""
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION")));
    }

    @Test
    void trainUpdateAndDeleteGuard() throws Exception {

        String number = smallTrain();
        String admin = adminToken();
        String user = userToken();

        Map<String, Object> update = Map.ofEntries(
                Map.entry("trainNumber", number),
                Map.entry("trainName", "Renamed Express"),
                Map.entry("source", "New Delhi"),
                Map.entry("destination", "Amritsar Jn"),
                Map.entry("daysOfRun", List.of("Mon", "Tue")),
                Map.entry("classes", List.of(
                        Map.of(
                                "classType", "SL",
                                "totalSeats", 2,
                                "fare", 120,
                                "racLimit", 1,
                                "waitingLimit", 2
                        )
                ))
        );

        mvc.perform(put("/train/" + number)
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trainName", is("Renamed Express")));

        // Active booking blocks deletion.
        JsonNode booking = book(user, number, 1);

        mvc.perform(delete("/train/" + number)
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("TRAIN_HAS_BOOKINGS")));

        // Cancel then delete succeeds.
        mvc.perform(delete("/booking/cancel/" + booking.get("pnr").asText())
                        .header("Authorization", "Bearer " + user))
                .andExpect(status().isOk());

        mvc.perform(delete("/train/" + number)
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok", is(true)));
    }

    // -------------------------------------------------------------
    // Booking
    // -------------------------------------------------------------

    @Test
    void bookingRequiresAuthAndValidates() throws Exception {

        mvc.perform(post("/booking/book")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(bookPayload("12903", 1))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));

        mvc.perform(post("/booking/book")
                        .header("Authorization", "Bearer " + userToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "trainNumber", "12903",
                                "journeyDate", "bad",
                                "classType", "SL",
                                "passengers", List.of()
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION")));
    }

    @Test
    void multiPassengerBookingShape() throws Exception {

        String number = smallTrain();

        JsonNode booking = book(userToken(), number, 2);

        org.junit.jupiter.api.Assertions.assertEquals(
                10,
                booking.get("pnr").asText().length()
        );

        org.junit.jupiter.api.Assertions.assertEquals(
                "CONFIRMED",
                booking.get("status").asText()
        );

        org.junit.jupiter.api.Assertions.assertEquals(
                2,
                booking.get("passengers").size()
        );

        org.junit.jupiter.api.Assertions.assertNotNull(booking.get("id"));
        org.junit.jupiter.api.Assertions.assertNotNull(booking.get("createdAt"));

        JsonNode passenger = booking.get("passengers").get(0);

        org.junit.jupiter.api.Assertions.assertEquals(
                "CONFIRMED",
                passenger.get("status").asText()
        );

        org.junit.jupiter.api.Assertions.assertTrue(
                passenger.get("seatNumber").isInt()
        );

        org.junit.jupiter.api.Assertions.assertNotNull(
                passenger.get("coachNumber")
        );

        org.junit.jupiter.api.Assertions.assertNotNull(
                passenger.get("berthType")
        );
    }

    @Test
    void pnrPublicIsMaskedOwnerSeesFull() throws Exception {

        String number = smallTrain();
        String owner = registerUser();

        JsonNode booking = book(owner, number, 1);

        String pnr = booking.get("pnr").asText();

        mvc.perform(get("/booking/pnr/" + pnr))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userEmail").doesNotExist())
                .andExpect(jsonPath("$.passengers[0].name", not(is("Pax 1"))));

        mvc.perform(get("/booking/pnr/" + pnr)
                        .header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userEmail").isString())
                .andExpect(jsonPath("$.passengers[0].name", is("Pax 1")));

        mvc.perform(get("/booking/pnr/0000000000"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code", is("PNR_NOT_FOUND")));
    }

    @Test
    void myBookingsRequiresAuthAndLists() throws Exception {

        mvc.perform(get("/booking/my"))
                .andExpect(status().isUnauthorized());

        String owner = registerUser();
        String number = smallTrain();

        book(owner, number, 1);

        mvc.perform(get("/booking/my")
                        .header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                .andExpect(jsonPath("$[0].pnr").isString());
    }

    @Test
    void cancelOwnershipAndRacPromotion() throws Exception {

        String number = smallTrain();

        String owner = registerUser();
        String other = registerUser();

        JsonNode confirmed = book(owner, number, 2);
        JsonNode rac = book(owner, number, 1);

        org.junit.jupiter.api.Assertions.assertEquals(
                "RAC",
                rac.get("status").asText()
        );

        // Non-owner cannot cancel.
        mvc.perform(delete("/booking/cancel/" + confirmed.get("pnr").asText())
                        .header("Authorization", "Bearer " + other))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("FORBIDDEN")));

        // Owner cancels -> RAC booking is promoted to CONFIRMED.
        mvc.perform(delete("/booking/cancel/" + confirmed.get("pnr").asText())
                        .header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CANCELLED")));

        mvc.perform(get("/booking/pnr/" + rac.get("pnr").asText())
                        .header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CONFIRMED")));
    }

    // -------------------------------------------------------------
    // Chatbot
    // -------------------------------------------------------------

    @Test
    void chatbotIsPublicWithShapeAndValidation() throws Exception {

        mvc.perform(post("/chatbot/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("question", "What is RAC?"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").isString());

        mvc.perform(post("/chatbot/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("question", ""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION")));
    }

    // -------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------

    @Test
    void adminEndpointsAreAdminOnlyWithShape() throws Exception {

        mvc.perform(get("/admin/stats"))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/admin/stats")
                        .header("Authorization", "Bearer " + userToken()))
                .andExpect(status().isForbidden());

        String admin = adminToken();

        mvc.perform(get("/admin/stats")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.users").isNumber())
                .andExpect(jsonPath("$.trains").isNumber())
                .andExpect(jsonPath("$.bookings").isNumber())
                .andExpect(jsonPath("$.confirmed").isNumber())
                .andExpect(jsonPath("$.rac").isNumber())
                .andExpect(jsonPath("$.wl").isNumber())
                .andExpect(jsonPath("$.cancelled").isNumber())
                .andExpect(jsonPath("$.revenue").isNumber());

        mvc.perform(get("/admin/users")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                .andExpect(jsonPath("$[0].password").doesNotExist());

        mvc.perform(get("/admin/trains")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mvc.perform(get("/admin/bookings")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}