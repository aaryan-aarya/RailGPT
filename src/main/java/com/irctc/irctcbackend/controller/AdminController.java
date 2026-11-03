package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.repository.BookingRepository;
import com.irctc.irctcbackend.repository.TrainRepository;
import com.irctc.irctcbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TrainRepository trainRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/trains")
    public List<Train> getAllTrains() {
        return trainRepository.findAll();
    }

    @GetMapping("/bookings")
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }
}