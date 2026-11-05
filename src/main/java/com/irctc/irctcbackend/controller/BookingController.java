package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.dto.BookingRequest;
import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.exception.ApiException;
import com.irctc.irctcbackend.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/booking")
public class BookingController {

    @Autowired private BookingService bookingService;

    @PostMapping("/book")
    public ResponseEntity<Booking> book(@Valid @RequestBody BookingRequest request, Authentication authentication) {
        Booking booking = bookingService.book(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(booking);
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
