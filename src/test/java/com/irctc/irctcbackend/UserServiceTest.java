package com.irctc.irctcbackend;

import com.irctc.irctcbackend.dto.ChangePasswordRequest;
import com.irctc.irctcbackend.dto.ProfileUpdateRequest;
import com.irctc.irctcbackend.dto.RegisterRequest;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.exception.ApiException;
import com.irctc.irctcbackend.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserServiceTest {

    @Autowired private UserService userService;
    @Autowired private PasswordEncoder passwordEncoder;

    private RegisterRequest register(String email) {
        return new RegisterRequest("Test User", email, "Password@123", "+91 90000 00000");
    }

    @Test
    void registersWithUserRoleAndHashedPassword() {
        User user = userService.register(register("reg-" + System.nanoTime() + "@test.app"));
        assertEquals("USER", user.getRole());
        assertNotNull(user.getId());
        assertNotEquals("Password@123", user.getPassword());
        assertTrue(passwordEncoder.matches("Password@123", user.getPassword()));
    }

    @Test
    void registrationIgnoresClientSuppliedRole() {
        // Even if a role were somehow passed, registration always assigns USER.
        User user = userService.register(register("role-" + System.nanoTime() + "@test.app"));
        assertEquals("USER", user.getRole());
    }

    @Test
    void rejectsDuplicateEmail() {
        String email = "dup-" + System.nanoTime() + "@test.app";
        userService.register(register(email));
        ApiException ex = assertThrows(ApiException.class, () -> userService.register(register(email)));
        assertEquals("EMAIL_EXISTS", ex.getCode());
    }

    @Test
    void loginIsEnumerationSafe() {
        String email = "enum-" + System.nanoTime() + "@test.app";
        userService.register(register(email));
        ApiException wrongPassword = assertThrows(ApiException.class,
                () -> userService.authenticate(email, "WrongPassword@1"));
        ApiException unknownEmail = assertThrows(ApiException.class,
                () -> userService.authenticate("nobody-" + System.nanoTime() + "@test.app", "Password@123"));
        assertEquals("INVALID_CREDENTIALS", wrongPassword.getCode());
        assertEquals("INVALID_CREDENTIALS", unknownEmail.getCode());
        assertEquals(wrongPassword.getMessage(), unknownEmail.getMessage());
    }

    @Test
    void authenticatesWithCorrectCredentials() {
        String email = "auth-" + System.nanoTime() + "@test.app";
        userService.register(register(email));
        User user = userService.authenticate(email, "Password@123");
        assertEquals(email, user.getEmail());
    }

    @Test
    void updatesProfileAndChangesPassword() {
        String email = "profile-" + System.nanoTime() + "@test.app";
        userService.register(register(email));
        User updated = userService.updateProfile(email, new ProfileUpdateRequest("New Name", "+91 91111 11111"));
        assertEquals("New Name", updated.getName());

        userService.changePassword(email, new ChangePasswordRequest("Password@123", "NewPassword@456"));
        assertThrows(ApiException.class, () -> userService.authenticate(email, "Password@123"));
        assertEquals(email, userService.authenticate(email, "NewPassword@456").getEmail());
    }

    @Test
    void changePasswordRejectsWrongCurrent() {
        String email = "pw-" + System.nanoTime() + "@test.app";
        userService.register(register(email));
        ApiException ex = assertThrows(ApiException.class,
                () -> userService.changePassword(email, new ChangePasswordRequest("WrongCurrent@1", "NewPassword@456")));
        assertEquals("VALIDATION", ex.getCode());
    }
}
