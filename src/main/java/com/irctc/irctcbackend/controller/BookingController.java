package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/booking")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    @PostMapping("/book")
    public Booking bookTicket(@RequestBody Booking booking) {
        return bookingService.bookTicket(booking);
    }

    @GetMapping("/pnr/{pnr}")
    public Booking getPnrStatus(@PathVariable String pnr) {
        return bookingService.getBookingByPnr(pnr);
    }

    @DeleteMapping("/cancel/{pnr}")
    public Booking cancelTicket(@PathVariable String pnr) {
        return bookingService.cancelTicket(pnr);
    }

    @GetMapping("/user/{email}")
    public List<Booking> getBookingsByUser(
            @PathVariable String email) {

        return bookingService.getBookingsByUser(email);
    }
}