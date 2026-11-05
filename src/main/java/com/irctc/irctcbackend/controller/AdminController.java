package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.dto.AdminStats;
import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.service.AdminService;
import com.irctc.irctcbackend.service.TrainService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired private AdminService adminService;
    @Autowired private TrainService trainService;

    @GetMapping("/stats")
    public AdminStats stats() {
        return adminService.stats();
    }

    @GetMapping("/users")
    public List<User> users() {
        return adminService.users();
    }

    @GetMapping("/trains")
    public List<Train> trains() {
        return trainService.getAll();
    }

    @GetMapping("/bookings")
    public List<Booking> bookings() {
        return adminService.bookings();
    }
}
