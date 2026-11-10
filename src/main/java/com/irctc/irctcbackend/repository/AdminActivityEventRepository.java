package com.irctc.irctcbackend.repository;

import com.irctc.irctcbackend.entity.AdminActivityEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminActivityEventRepository extends JpaRepository<AdminActivityEvent, Long> {
    Page<AdminActivityEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<AdminActivityEvent> findAllByTargetIdContainingIgnoreCaseOrActionContainingIgnoreCaseOrActorEmailContainingIgnoreCaseOrDetailsContainingIgnoreCaseOrderByCreatedAtDesc(
            String targetId, String action, String actorEmail, String details, Pageable pageable);
}
