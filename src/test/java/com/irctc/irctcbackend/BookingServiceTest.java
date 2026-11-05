package com.irctc.irctcbackend;

import com.irctc.irctcbackend.dto.BookingRequest;
import com.irctc.irctcbackend.dto.PassengerInput;
import com.irctc.irctcbackend.dto.TrainClassInput;
import com.irctc.irctcbackend.dto.TrainInput;
import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.Passenger;
import com.irctc.irctcbackend.exception.ApiException;
import com.irctc.irctcbackend.service.BookingService;
import com.irctc.irctcbackend.service.TrainService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Verifies the ported booking engine against an in-memory H2 database:
 * confirmed allocation, RAC/WL overflow, capacity limits, cancellation with
 * queue promotion, and ownership enforcement.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BookingServiceTest {

    @Autowired private BookingService bookingService;
    @Autowired private TrainService trainService;

    private String date() {
        return LocalDate.now().plusDays(5).toString();
    }

    /** Small train: 2 confirmed seats, 1 RAC slot, 2 WL slots (5 total). */
    private void smallTrain(String number) {
        TrainInput input = new TrainInput(number, "Test Express", "New Delhi", "Amritsar Jn",
                "06:00", "12:00", 360, 450, "Superfast", List.of("Mon"),
                List.of(new TrainClassInput("SL", 2, 100, 1, 2)));
        trainService.addTrain(input);
    }

    private BookingRequest req(String number, int paxCount) {
        List<PassengerInput> pax = new ArrayList<>();
        for (int i = 0; i < paxCount; i++) {
            pax.add(new PassengerInput("Passenger " + (i + 1), 30, "M", null));
        }
        return new BookingRequest(number, date(), "SL", pax, null, null);
    }

    @Test
    void booksConfirmedSeatsLowestFirst() {
        smallTrain("90001");
        Booking b = bookingService.book("aarav@test.app", req("90001", 2));
        assertEquals("CONFIRMED", b.getStatus());
        assertEquals(10, b.getPnr().length());
        assertEquals(2, b.getPassengers().size());
        assertEquals(1, b.getPassengers().get(0).getSeatNumber());
        assertEquals(2, b.getPassengers().get(1).getSeatNumber());
        assertEquals(200, b.getTotalFare());
    }

    @Test
    void overflowGoesToRacThenWaitingList() {
        smallTrain("90002");
        Booking confirmed = bookingService.book("u1@test.app", req("90002", 2));
        Booking rac = bookingService.book("u2@test.app", req("90002", 1));
        Booking wl = bookingService.book("u3@test.app", req("90002", 2));

        assertEquals("CONFIRMED", confirmed.getStatus());
        assertEquals("RAC", rac.getStatus());
        assertEquals(1, rac.getPassengers().get(0).getRacNumber());
        assertEquals("WL", wl.getStatus());
        assertEquals(1, wl.getPassengers().get(0).getWaitingNumber());
        assertEquals(2, wl.getPassengers().get(1).getWaitingNumber());
    }

    @Test
    void rejectsBookingBeyondCapacity() {
        smallTrain("90003");
        bookingService.book("u1@test.app", req("90003", 2)); // 2 confirmed
        bookingService.book("u2@test.app", req("90003", 1)); // 1 RAC
        bookingService.book("u3@test.app", req("90003", 2)); // 2 WL -> full
        ApiException ex = assertThrows(ApiException.class,
                () -> bookingService.book("u4@test.app", req("90003", 1)));
        assertEquals("TRAIN_FULL", ex.getCode());
    }

    @Test
    void cancellationPromotesQueuedPassengers() {
        smallTrain("90004");
        Booking confirmed = bookingService.book("u1@test.app", req("90004", 2));
        Booking rac = bookingService.book("u2@test.app", req("90004", 1));
        assertEquals("RAC", rac.getStatus());

        bookingService.cancel("u1@test.app", false, confirmed.getPnr());

        Booking reloaded = bookingService.getPnr(rac.getPnr(), "u2@test.app", false);
        assertEquals("CONFIRMED", reloaded.getStatus());
        Passenger promoted = reloaded.getPassengers().get(0);
        assertEquals("CONFIRMED", promoted.getStatus());
        assertNotNull(promoted.getSeatNumber());
        assertNull(promoted.getRacNumber());
    }

    @Test
    void nonOwnerCannotCancel() {
        smallTrain("90005");
        Booking b = bookingService.book("owner@test.app", req("90005", 1));
        ApiException ex = assertThrows(ApiException.class,
                () -> bookingService.cancel("intruder@test.app", false, b.getPnr()));
        assertEquals("FORBIDDEN", ex.getCode());
        // Admin can cancel any booking.
        Booking cancelled = bookingService.cancel("admin@test.app", true, b.getPnr());
        assertEquals("CANCELLED", cancelled.getStatus());
    }

    @Test
    void publicPnrMasksPersonalData() {
        smallTrain("90006");
        Booking b = bookingService.book("owner@test.app", req("90006", 1));
        Booking publicView = bookingService.getPnr(b.getPnr(), null, false);
        assertNull(publicView.getUserEmail());
        assertNotEquals("Passenger 1", publicView.getPassengers().get(0).getName());
        // Owner sees full data.
        Booking ownerView = bookingService.getPnr(b.getPnr(), "owner@test.app", false);
        assertEquals("owner@test.app", ownerView.getUserEmail());
        assertEquals("Passenger 1", ownerView.getPassengers().get(0).getName());
    }

    @Test
    void rejectsPastJourneyDate() {
        smallTrain("90007");
        BookingRequest past = new BookingRequest("90007", LocalDate.now().minusDays(1).toString(),
                "SL", List.of(new PassengerInput("Passenger 1", 30, "M", null)), null, null);
        ApiException ex = assertThrows(ApiException.class, () -> bookingService.book("u@test.app", past));
        assertEquals("VALIDATION", ex.getCode());
    }

    @Test
    void mixedConfirmedAndRacYieldsPartialStatus() {
        // 1 confirmed seat + 2 RAC slots; booking 2 passengers -> 1 CONFIRMED + 1 RAC.
        trainService.addTrain(new TrainInput("90008", "Partial Express", "New Delhi", "Amritsar Jn",
                "06:00", "12:00", 360, 450, "Superfast", List.of("Mon"),
                List.of(new TrainClassInput("SL", 1, 100, 2, 2))));
        Booking b = bookingService.book("u@test.app", req("90008", 2));
        assertEquals("PARTIAL", b.getStatus());
        assertEquals("CONFIRMED", b.getPassengers().get(0).getStatus());
        assertEquals("RAC", b.getPassengers().get(1).getStatus());
    }

    @Test
    void allocatesBerthsAndCoachesByPattern() {
        trainService.addTrain(new TrainInput("90009", "Berth Express", "New Delhi", "Amritsar Jn",
                "06:00", "12:00", 360, 450, "Superfast", List.of("Mon"),
                List.of(new TrainClassInput("SL", 8, 100, 2, 2))));
        Booking b = bookingService.book("u@test.app", req("90009", 3));
        // SL pattern: LB, MB, UB for seats 1..3, all in coach S1.
        assertEquals("LB", b.getPassengers().get(0).getBerthType());
        assertEquals("MB", b.getPassengers().get(1).getBerthType());
        assertEquals("UB", b.getPassengers().get(2).getBerthType());
        assertEquals("S1", b.getPassengers().get(0).getCoachNumber());
    }

    @Test
    void rejectsMultiPassengerRequestBeyondCapacity() {
        smallTrain("90010"); // capacity = 2 seats + 1 RAC + 2 WL = 5
        BookingRequest tooMany = req("90010", 6);
        ApiException ex = assertThrows(ApiException.class, () -> bookingService.book("u@test.app", tooMany));
        assertEquals("TRAIN_FULL", ex.getCode());
    }
}
