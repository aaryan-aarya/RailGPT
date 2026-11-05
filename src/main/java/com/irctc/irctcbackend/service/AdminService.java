package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.dto.AdminStats;
import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.repository.BookingRepository;
import com.irctc.irctcbackend.repository.PassengerRepository;
import com.irctc.irctcbackend.repository.TrainRepository;
import com.irctc.irctcbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {

    @Autowired private UserRepository userRepository;
    @Autowired private TrainRepository trainRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private PassengerRepository passengerRepository;

    public AdminStats stats() {
        return new AdminStats(
                userRepository.count(),
                trainRepository.count(),
                bookingRepository.count(),
                passengerRepository.countByStatus("CONFIRMED"),
                passengerRepository.countByStatus("RAC"),
                passengerRepository.countByStatus("WL"),
                passengerRepository.countByStatus("CANCELLED"),
                bookingRepository.sumActiveFare());
    }

    public List<User> users() {
        return userRepository.findAll();
    }

    public List<Booking> bookings() {
        return bookingRepository.findAllByOrderByCreatedAtDesc();
    }
}
