package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.dto.AdminStats;
import com.irctc.irctcbackend.dto.AdminEmailOutboxItem;
import com.irctc.irctcbackend.dto.AdminRoleUpdateRequest;
import com.irctc.irctcbackend.entity.AdminActivityEvent;
import com.irctc.irctcbackend.entity.BookingAuditEvent;
import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.service.AdminService;
import com.irctc.irctcbackend.service.BookingAuditService;
import com.irctc.irctcbackend.service.TrainService;
import com.irctc.irctcbackend.service.TicketEmailOutboxService;
import com.irctc.irctcbackend.service.AdminActivityService;
import org.springframework.data.domain.Page;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired private AdminService adminService;
    @Autowired private TrainService trainService;
    @Autowired private BookingAuditService bookingAuditService;
    @Autowired private TicketEmailOutboxService ticketEmailOutboxService;
    @Autowired private AdminActivityService adminActivityService;

    @GetMapping("/stats")
    public AdminStats stats() {
        return adminService.stats();
    }

    @GetMapping("/users")
    public List<User> users() {
        return adminService.users();
    }

    @PatchMapping("/users/{id}/role")
    public User updateUserRole(@PathVariable long id, @Valid @RequestBody AdminRoleUpdateRequest request,
                               Authentication authentication) {
        return adminService.updateRole(id, request.role(), authentication.getName());
    }

    @GetMapping("/trains")
    public List<Train> trains() {
        return trainService.getAll();
    }

    @GetMapping("/bookings")
    public List<Booking> bookings() {
        return adminService.bookings();
    }

    @GetMapping("/audit")
    public Page<BookingAuditEvent> audit(@RequestParam(required = false) String pnr,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "25") int size) {
        return bookingAuditService.search(pnr, page, size);
    }

    @GetMapping("/activity")
    public Page<AdminActivityEvent> activity(@RequestParam(required = false) String q,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "25") int size) {
        return adminActivityService.search(q, page, size);
    }

    @GetMapping("/email-outbox")
    public List<AdminEmailOutboxItem> emailOutbox(@RequestParam(defaultValue = "DEAD") String status) {
        return ticketEmailOutboxService.recent(status);
    }

    @PostMapping("/email-outbox/{id}/retry")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Transactional
    public void retryEmail(@PathVariable long id, Authentication authentication) {
        ticketEmailOutboxService.retry(id);
        adminActivityService.record(authentication.getName(), "EMAIL_RETRY_QUEUED", "EMAIL_JOB", String.valueOf(id),
                "Queued a failed notification for another delivery attempt.");
    }
}
