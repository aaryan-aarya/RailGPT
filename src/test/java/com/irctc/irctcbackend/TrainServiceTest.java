package com.irctc.irctcbackend;

import com.irctc.irctcbackend.dto.*;
import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.exception.ApiException;
import com.irctc.irctcbackend.service.BookingService;
import com.irctc.irctcbackend.service.TrainService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TrainServiceTest {

    @Autowired private TrainService trainService;
    @Autowired private BookingService bookingService;

    private TrainInput input(String number) {
        return new TrainInput(number, "Availability Express", "New Delhi", "Amritsar Jn",
                "06:00", "12:00", 360, 450, "Superfast", List.of("Mon", "Tue"),
                List.of(new TrainClassInput("SL", 2, 100, 1, 2),
                        new TrainClassInput("3A", 4, 250, 2, 4)));
    }

    @Test
    void addsTrainAndComputesFreshAvailability() {
        String number = "93001";
        trainService.addTrain(input(number));
        Train train = trainService.getByNumber(number, LocalDate.now().plusDays(3).toString());
        Map<String, ClassAvailability> avail = train.getAvailability();
        assertNotNull(avail);
        assertEquals(2, avail.get("SL").availableSeats());
        assertEquals("AVAILABLE", avail.get("SL").status());
        assertEquals(4, avail.get("3A").availableSeats());
    }

    @Test
    void availabilityReflectsBookings() {
        String number = "93002";
        trainService.addTrain(input(number));
        String date = LocalDate.now().plusDays(3).toString();
        BookingRequest req = new BookingRequest(number, date, "SL",
                List.of(new PassengerInput("Pax One", 30, "M", null),
                        new PassengerInput("Pax Two", 28, "F", null)), null, null);
        bookingService.book("user@test.app", req);

        Train train = trainService.getByNumber(number, date);
        ClassAvailability sl = train.getAvailability().get("SL");
        assertEquals(0, sl.availableSeats());
        assertEquals(2, sl.confirmedCount());
        // 3A is untouched.
        assertEquals(4, train.getAvailability().get("3A").availableSeats());
    }

    @Test
    void searchFiltersBySourceAndDestination() {
        trainService.addTrain(input("93003"));
        List<Train> found = trainService.search("New Delhi", "Amritsar", null);
        assertTrue(found.stream().anyMatch(t -> t.getTrainNumber().equals("93003")));
        List<Train> none = trainService.search("Nowhere", "Atlantis", null);
        assertTrue(none.stream().noneMatch(t -> t.getTrainNumber().equals("93003")));
    }

    @Test
    void rejectsDuplicateTrainNumber() {
        trainService.addTrain(input("93004"));
        ApiException ex = assertThrows(ApiException.class, () -> trainService.addTrain(input("93004")));
        assertEquals("TRAIN_EXISTS", ex.getCode());
    }

    @Test
    void updatesTrainClasses() {
        trainService.addTrain(input("93005"));
        TrainInput updated = new TrainInput("93005", "Renamed Express", "New Delhi", "Amritsar Jn",
                "07:00", "13:00", 360, 450, "Superfast", List.of("Mon"),
                List.of(new TrainClassInput("CC", 10, 500, 2, 4)));
        Train result = trainService.updateTrain("93005", updated);
        assertEquals("Renamed Express", result.getTrainName());
        assertEquals(1, result.getClasses().size());
        assertEquals("CC", result.getClasses().get(0).getClassType());
    }

    @Test
    void deleteBlockedWithActiveBookingsButAllowedAfterCancel() {
        String number = "93006";
        trainService.addTrain(input(number));
        String date = LocalDate.now().plusDays(3).toString();
        BookingRequest req = new BookingRequest(number, date, "SL",
                List.of(new PassengerInput("Pax One", 30, "M", null)), null, null);
        var booking = bookingService.book("user@test.app", req);

        ApiException ex = assertThrows(ApiException.class, () -> trainService.deleteTrain(number));
        assertEquals("TRAIN_HAS_BOOKINGS", ex.getCode());

        bookingService.cancel("user@test.app", false, booking.getPnr());
        assertDoesNotThrow(() -> trainService.deleteTrain(number));
    }
}
