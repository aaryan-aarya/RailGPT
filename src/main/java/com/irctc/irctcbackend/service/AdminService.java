package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.dto.AdminStats;
import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.repository.BookingRepository;
import com.irctc.irctcbackend.repository.PassengerRepository;
import com.irctc.irctcbackend.repository.TrainRepository;
import com.irctc.irctcbackend.repository.UserRepository;
import com.irctc.irctcbackend.exception.ApiException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AdminService {

    @Autowired private UserRepository userRepository;
    @Autowired private TrainRepository trainRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private PassengerRepository passengerRepository;
    @Autowired private AdminActivityService adminActivityService;

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

    @Transactional
    public User updateRole(long userId, String role, String actorEmail) {
        if (!"USER".equals(role) && !"ADMIN".equals(role)) {
            throw ApiException.badRequest("INVALID_ROLE", "Role must be USER or ADMIN.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));
        if (user.getEmail().equalsIgnoreCase(actorEmail)) {
            throw ApiException.conflict("SELF_ROLE_CHANGE", "You cannot change your own administrator role.");
        }
        if ("ADMIN".equals(user.getRole()) && "USER".equals(role)
                && userRepository.findAllByRoleForUpdate("ADMIN").size() <= 1) {
            throw ApiException.conflict("LAST_ADMIN", "The last administrator cannot be demoted.");
        }
        String previous = user.getRole();
        user.setRole(role);
        adminActivityService.record(actorEmail, "USER_ROLE_CHANGED", "USER", String.valueOf(userId),
                "Changed " + user.getEmail() + " role from " + previous + " to " + role + ".");
        return user;
    }
}
