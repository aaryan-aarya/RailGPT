package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.dto.BookingRequest;
import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.exception.ApiException;
import com.irctc.irctcbackend.service.BookingService;
import com.irctc.irctcbackend.service.TicketEmailOutboxService;
import com.irctc.irctcbackend.service.TicketPdfService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/booking")
public class BookingController {

    @Autowired private BookingService bookingService;
    @Autowired private TicketPdfService ticketPdfService;
    @Autowired private TicketEmailOutboxService ticketEmailOutboxService;

    @PostMapping("/book")
    public ResponseEntity<Booking> book(@Valid @RequestBody BookingRequest request,
                                        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
                                        Authentication authentication) {
        BookingService.BookingOutcome outcome = bookingService.bookWithOutcome(authentication.getName(), request, idempotencyKey);
        Booking booking = outcome.booking();
        return ResponseEntity.status(outcome.created() ? HttpStatus.CREATED : HttpStatus.OK).body(booking);
    }

    @GetMapping(value = "/pnr/{pnr}/ticket.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadTicket(@PathVariable String pnr, Authentication authentication) {
        Booking booking = bookingService.getTicketBooking(pnr, authentication.getName(), isAdmin(authentication));
        byte[] pdf = ticketPdfService.createTicket(booking);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=RailGPT-ticket-" + booking.getPnr() + ".pdf")
                .body(pdf);
    }

    @PostMapping("/pnr/{pnr}/email")
    public ResponseEntity<Map<String, String>> emailTicket(@PathVariable String pnr, Authentication authentication) {
        Booking booking = bookingService.getTicketBooking(pnr, authentication.getName(), isAdmin(authentication));
        ticketEmailOutboxService.enqueueResend(booking.getPnr(), booking.getUserEmail());
        return ResponseEntity.accepted().body(Map.of("message", "Ticket email queued for " + booking.getUserEmail()));
    }

    @GetMapping("/pnr/{pnr}")
    public Booking pnr(@PathVariable String pnr, Authentication authentication) {
        String viewer = authentication == null ? null : authentication.getName();
        boolean isAdmin = isAdmin(authentication);
        return bookingService.getPnr(pnr, viewer, isAdmin);
    }

    @GetMapping("/my")
    public List<Booking> my(Authentication authentication) {
        return bookingService.getMyBookings(authentication.getName());
    }

    @GetMapping("/user/{email}")
    public List<Booking> byUser(@PathVariable String email, Authentication authentication) {
        String target = email.toLowerCase();
        if (!isAdmin(authentication) && !authentication.getName().equals(target)) {
            throw ApiException.forbidden("FORBIDDEN", "You can only view your own bookings.");
        }
        return bookingService.getMyBookings(target);
    }

    @DeleteMapping("/cancel/{pnr}")
    public Booking cancel(@PathVariable String pnr, Authentication authentication) {
        return bookingService.cancel(authentication.getName(), isAdmin(authentication), pnr);
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}
