package com.irctc.irctcbackend;

import com.irctc.irctcbackend.dto.BookingRequest;
import com.irctc.irctcbackend.dto.PassengerInput;
import com.irctc.irctcbackend.dto.TrainClassInput;
import com.irctc.irctcbackend.dto.TrainInput;
import com.irctc.irctcbackend.exception.ApiException;
import com.irctc.irctcbackend.service.BookingService;
import com.irctc.irctcbackend.service.TrainService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Verifies concurrent-booking protection. NOT @Transactional: each book() call
 * runs in its own committed transaction so the pessimistic train lock is actually
 * exercised across threads. A single-seat train with no RAC/WL must admit exactly
 * one confirmed booking no matter how many threads race for it.
 */
@SpringBootTest
@ActiveProfiles("test")
class BookingConcurrencyTest {

    @Autowired private BookingService bookingService;
    @Autowired private TrainService trainService;

    @Test
    void concurrentBookingsCannotOverbookASingleSeat() throws Exception {
        String number = "95001";
        trainService.addTrain(new TrainInput(number, "Concurrency Express", "New Delhi", "Amritsar Jn",
                "06:00", "12:00", 360, 450, "Superfast", List.of("Mon"),
                List.of(new TrainClassInput("SL", 1, 100, 0, 0)))); // 1 seat, no RAC/WL
        String date = LocalDate.now().plusDays(5).toString();

        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        try {
            for (int i = 0; i < threads; i++) {
                final int idx = i;
                results.add(pool.submit(() -> {
                    startGate.await();
                    try {
                        BookingRequest req = new BookingRequest(number, date, "SL",
                                List.of(new PassengerInput("Racer " + idx, 30, "M", null)), null, null);
                        bookingService.book("racer" + idx + "@test.app", req);
                        return true;
                    } catch (ApiException e) {
                        assertEquals("TRAIN_FULL", e.getCode());
                        return false;
                    }
                }));
            }
            startGate.countDown(); // release all threads at once
            int succeeded = 0;
            for (Future<Boolean> f : results) {
                if (f.get(15, TimeUnit.SECONDS)) succeeded++;
            }
            assertEquals(1, succeeded, "Exactly one booking may take the single seat");
        } finally {
            pool.shutdownNow();
        }
    }
}
