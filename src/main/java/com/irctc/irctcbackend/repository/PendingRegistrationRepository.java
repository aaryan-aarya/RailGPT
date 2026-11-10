
package com.irctc.irctcbackend.repository;

import com.irctc.irctcbackend.entity.PendingRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PendingRegistrationRepository
        extends JpaRepository<PendingRegistration, Long> {

    Optional<PendingRegistration> findByEmail(String email);

    boolean existsByEmail(String email);

    void deleteByEmail(String email);
}
