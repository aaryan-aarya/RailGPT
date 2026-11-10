package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.entity.AdminActivityEvent;
import com.irctc.irctcbackend.repository.AdminActivityEventRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminActivityService {
    private final AdminActivityEventRepository repository;

    public AdminActivityService(AdminActivityEventRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void record(String actor, String action, String targetType, String targetId, String details) {
        repository.save(AdminActivityEvent.builder()
                .actorEmail(actor)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .details(details)
                .createdAt(System.currentTimeMillis())
                .build());
    }

    @Transactional(readOnly = true)
    public Page<AdminActivityEvent> search(String query, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return query == null || query.isBlank()
                ? repository.findAllByOrderByCreatedAtDesc(pageable)
                : repository.findAllByTargetIdContainingIgnoreCaseOrActionContainingIgnoreCaseOrActorEmailContainingIgnoreCaseOrDetailsContainingIgnoreCaseOrderByCreatedAtDesc(
                        query.trim(), query.trim(), query.trim(), query.trim(), pageable);
    }
}
