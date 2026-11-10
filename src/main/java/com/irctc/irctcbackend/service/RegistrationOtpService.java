
package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.dto.RegisterRequest;
import com.irctc.irctcbackend.email.EmailService;
import com.irctc.irctcbackend.entity.PendingRegistration;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.exception.ApiException;
import com.irctc.irctcbackend.repository.PendingRegistrationRepository;
import com.irctc.irctcbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;

@Service
public class RegistrationOtpService {

    private static final int OTP_LENGTH = 6;
    private static final int MAX_ATTEMPTS = 5;
    private static final long OTP_EXPIRY_MS = 5 * 60 * 1000L;
    private static final long RESEND_COOLDOWN_MS = 60 * 1000L;

    private final PendingRegistrationRepository pendingRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String otpHashSecret;

    public RegistrationOtpService(
            PendingRegistrationRepository pendingRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            @Value("${railgpt.otp.hash-secret}") String otpHashSecret
    ) {
        this.pendingRepository = pendingRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.otpHashSecret = otpHashSecret;

        if (otpHashSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "OTP_HASH_SECRET must contain at least 32 bytes."
            );
        }
    }

    @Transactional
    public void startRegistration(RegisterRequest request) {

        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict(
                    "EMAIL_EXISTS",
                    "An account with this email already exists."
            );
        }

        long now = System.currentTimeMillis();

        PendingRegistration pending = pendingRepository.findByEmail(email)
                .orElse(null);

        if (pending != null && now - pending.getLastSentAt() < RESEND_COOLDOWN_MS) {
            throw ApiException.badRequest(
                    "OTP_COOLDOWN",
                    "Please wait before requesting another OTP."
            );
        }

        String otp = generateOtp();

        if (pending == null) {
            pending = PendingRegistration.builder()
                    .email(email)
                    .createdAt(now)
                    .build();
        }

        pending.setName(request.name().trim());
        pending.setPassword(passwordEncoder.encode(request.password()));
        pending.setPhone(
                request.phone() == null || request.phone().isBlank()
                        ? null
                        : request.phone().trim()
        );
        pending.setOtpHash(hashOtp(email, otp));
        pending.setExpiresAt(now + OTP_EXPIRY_MS);
        pending.setAttempts(0);
        pending.setLastSentAt(now);

        pendingRepository.saveAndFlush(pending);

        try {
            emailService.sendRegistrationOtp(email, otp);
        } catch (RuntimeException ex) {
            pendingRepository.delete(pending);
            throw new IllegalStateException(
                    "Unable to send verification email. Please try again.", ex
            );
        }
    }

    @Transactional(noRollbackFor = ApiException.class)
    public User verifyOtp(String emailInput, String otpInput) {

        String email = normalizeEmail(emailInput);
        String otp = otpInput == null ? "" : otpInput.trim();

        if (!otp.matches("\\d{6}")) {
            throw ApiException.badRequest(
                    "INVALID_OTP",
                    "Enter a valid six-digit OTP."
            );
        }

        PendingRegistration pending = pendingRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.badRequest(
                        "OTP_NOT_FOUND",
                        "No pending registration found. Please register again."
                ));

        long now = System.currentTimeMillis();

        if (pending.getExpiresAt() <= now) {
            pendingRepository.delete(pending);
            throw ApiException.badRequest(
                    "OTP_EXPIRED",
                    "OTP has expired. Please register again."
            );
        }

        if (pending.getAttempts() >= MAX_ATTEMPTS) {
            pendingRepository.delete(pending);
            throw ApiException.badRequest(
                    "OTP_ATTEMPTS_EXCEEDED",
                    "Maximum OTP attempts exceeded. Please register again."
            );
        }

        if (!constantTimeEquals(pending.getOtpHash(), hashOtp(email, otp))) {
            pending.setAttempts(pending.getAttempts() + 1);
            pendingRepository.save(pending);

            throw ApiException.badRequest(
                    "INVALID_OTP",
                    "Incorrect OTP. Please try again."
            );
        }

        if (userRepository.existsByEmail(email)) {
            pendingRepository.delete(pending);
            throw ApiException.conflict(
                    "EMAIL_EXISTS",
                    "An account with this email already exists."
            );
        }

        User user = User.builder()
                .name(pending.getName())
                .email(pending.getEmail())
                .password(pending.getPassword())
                .phone(pending.getPhone())
                .role("USER")
                .build();

        User savedUser = userRepository.saveAndFlush(user);

        pendingRepository.delete(pending);

        return savedUser;
    }

    @Transactional
    public void resendOtp(String emailInput) {

        String email = normalizeEmail(emailInput);

        PendingRegistration pending = pendingRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.badRequest(
                        "OTP_NOT_FOUND",
                        "No pending registration found. Please register again."
                ));

        long now = System.currentTimeMillis();

        if (now - pending.getLastSentAt() < RESEND_COOLDOWN_MS) {
            throw ApiException.badRequest(
                    "OTP_COOLDOWN",
                    "Please wait 60 seconds before requesting another OTP."
            );
        }

        String otp = generateOtp();

        pending.setOtpHash(hashOtp(email, otp));
        pending.setExpiresAt(now + OTP_EXPIRY_MS);
        pending.setAttempts(0);
        pending.setLastSentAt(now);

        pendingRepository.saveAndFlush(pending);

        try {
            emailService.sendRegistrationOtp(email, otp);
        } catch (RuntimeException ex) {
            throw new IllegalStateException(
                    "Unable to send verification email. Please try again.", ex
            );
        }
    }

    private String generateOtp() {
        int value = secureRandom.nextInt(1_000_000);
        return String.format(Locale.ROOT, "%06d", value);
    }

    private String hashOtp(String email, String otp) {

        try {
            Mac mac = Mac.getInstance("HmacSHA256");

            SecretKeySpec key = new SecretKeySpec(
                    otpHashSecret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            );

            mac.init(key);

            byte[] hash = mac.doFinal(
                    (email + ":" + otp).getBytes(StandardCharsets.UTF_8)
            );

            return Base64.getEncoder().encodeToString(hash);

        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash OTP.", ex);
        }
    }

    private boolean constantTimeEquals(String first, String second) {

        if (first == null || second == null) {
            return false;
        }

        return java.security.MessageDigest.isEqual(
                first.getBytes(StandardCharsets.UTF_8),
                second.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String normalizeEmail(String email) {

        if (email == null || email.isBlank()) {
            throw ApiException.badRequest(
                    "VALIDATION",
                    "Email is required."
            );
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }
}
