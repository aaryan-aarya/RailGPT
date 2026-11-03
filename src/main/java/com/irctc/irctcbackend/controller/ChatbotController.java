package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.dto.ChatRequest;
import com.irctc.irctcbackend.dto.ChatResponse;
import com.irctc.irctcbackend.service.ChatbotService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/chatbot")
public class ChatbotController {

    @Autowired
    private ChatbotService chatbotService;

    @PostMapping("/ask")
    public ChatResponse askQuestion(
            @RequestBody ChatRequest request) {

        return chatbotService.askQuestion(
                request.getQuestion()
        );
    }


}
