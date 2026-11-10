package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.email.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/email-test")
public class EmailTestController {

    private final EmailService emailService;

    public EmailTestController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping
    public ResponseEntity<String> sendTestEmail(
            @RequestParam String recipient) {

        emailService.sendTestEmail(recipient);

        return ResponseEntity.ok(
                "Test email sent successfully to " + recipient
        );
    }
}