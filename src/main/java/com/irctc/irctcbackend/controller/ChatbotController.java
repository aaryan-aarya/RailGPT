package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.dto.ChatRequest;
import com.irctc.irctcbackend.dto.ChatResponse;
import com.irctc.irctcbackend.service.ChatbotService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/chatbot")
public class ChatbotController {

    @Autowired private ChatbotService chatbotService;

    @PostMapping("/ask")
    public ChatResponse ask(@Valid @RequestBody ChatRequest request, Authentication authentication) {
        String viewer = authentication == null ? null : authentication.getName();
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        return chatbotService.ask(request.getQuestion(), viewer, isAdmin);
    }
}
