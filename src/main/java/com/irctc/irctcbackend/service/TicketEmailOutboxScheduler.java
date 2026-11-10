package com.irctc.irctcbackend.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Component
@ConditionalOnProperty(name = "railgpt.email.outbox.enabled", havingValue = "true", matchIfMissing = true)
public class TicketEmailOutboxScheduler {
    private final TicketEmailOutboxService outboxService;

    public TicketEmailOutboxScheduler(TicketEmailOutboxService outboxService) {
        this.outboxService = outboxService;
    }

    @Scheduled(fixedDelayString = "${railgpt.email.outbox.poll-ms:5000}")
    public void dispatch() {
        outboxService.dispatchDueMessages();
    }
}
