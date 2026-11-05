package com.irctc.irctcbackend;

import com.irctc.irctcbackend.config.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/** Unit tests for JWT generation/validation without loading a Spring context. */
class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "configuredSecret",
                "unit-test-secret-unit-test-secret-unit-test-1234");
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 3600000L);
        ReflectionTestUtils.invokeMethod(jwtUtil, "init");
    }

    @Test
    void generatesTokenWithSubjectAndRole() {
        String token = jwtUtil.generateToken("user@test.app", "ADMIN");
        assertNotNull(token);
        assertEquals("user@test.app", jwtUtil.extractEmail(token));
        assertEquals("ADMIN", jwtUtil.extractRole(token));
        assertTrue(jwtUtil.isTokenValid(token));
    }

    @Test
    void defaultsRoleToUserWhenMissing() {
        // A token signed with the same key but no role claim should resolve to USER.
        String token = jwtUtil.generateToken("user@test.app", "USER");
        assertEquals("USER", jwtUtil.extractRole(token));
    }

    @Test
    void rejectsTamperedToken() {
        String token = jwtUtil.generateToken("user@test.app", "USER");
        String tampered = token.substring(0, token.length() - 3) + "abc";
        assertFalse(jwtUtil.isTokenValid(tampered));
    }

    @Test
    void rejectsExpiredToken() {
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", -1000L);
        ReflectionTestUtils.invokeMethod(jwtUtil, "init");
        String token = jwtUtil.generateToken("user@test.app", "USER");
        assertFalse(jwtUtil.isTokenValid(token));
    }

    @Test
    void rejectsTokenSignedWithDifferentKey() {
        JwtUtil other = new JwtUtil();
        ReflectionTestUtils.setField(other, "configuredSecret",
                "another-secret-another-secret-another-secret-99");
        ReflectionTestUtils.setField(other, "expirationMs", 3600000L);
        ReflectionTestUtils.invokeMethod(other, "init");
        String foreignToken = other.generateToken("user@test.app", "ADMIN");
        assertFalse(jwtUtil.isTokenValid(foreignToken));
    }

    @Test
    void generatesEphemeralKeyWhenSecretAbsent() {
        JwtUtil ephemeral = new JwtUtil();
        ReflectionTestUtils.setField(ephemeral, "configuredSecret", "");
        ReflectionTestUtils.setField(ephemeral, "expirationMs", 3600000L);
        ReflectionTestUtils.invokeMethod(ephemeral, "init");
        String token = ephemeral.generateToken("user@test.app", "USER");
        assertTrue(ephemeral.isTokenValid(token));
    }
}
