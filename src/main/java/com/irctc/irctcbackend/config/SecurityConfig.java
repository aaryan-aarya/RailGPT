
package com.irctc.irctcbackend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

import java.util.Map;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    @Autowired
    private CookieOriginGuardFilter cookieOriginGuardFilter;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .cors(withDefaults())
                .csrf(csrf -> csrf.disable())
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
                                "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; " +
                                "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"))
                        .frameOptions(frame -> frame.deny())
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .permissionsPolicy(policy -> policy.policy("camera=(), microphone=(), geolocation=()"))
                )

                .authorizeHttpRequests(auth -> auth

                        // Public authentication and registration endpoints
                        .requestMatchers(
                                "/auth/register",
                                "/auth/verify-otp",
                                "/auth/resend-otp",
                                "/auth/login",
                                "/auth/logout"
                        ).permitAll()

                        // Public metadata and minimal health probe.
                        .requestMatchers(
                                "/meta",
                                "/health",
                                "/stations",
                                "/actuator/health",
                                "/actuator/health/**"
                        ).permitAll()

                        // API docs can expose implementation details; restrict them to admins.
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).hasRole("ADMIN")

                        // Metrics and other Actuator endpoints are operations-only.
                        .requestMatchers("/actuator/**").hasRole("ADMIN")

                        // Public train reads
                        .requestMatchers(HttpMethod.GET, "/train/**").permitAll()

                        // Train writes are admin-only
                        .requestMatchers("/train/**").hasRole("ADMIN")

                        // Public masked PNR lookup
                        // Ticket PDF contains full passenger details and is owner/admin only.
                        .requestMatchers(HttpMethod.GET, "/booking/pnr/*/ticket.pdf").authenticated()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/booking/pnr/**"
                        ).permitAll()

                        // Booking operations require authentication
                        .requestMatchers("/booking/**").authenticated()

                        // Public chatbot
                        .requestMatchers("/chatbot/**").permitAll()

                        // User profile
                        .requestMatchers("/user/**").authenticated()

                        // Admin console
                        .requestMatchers("/admin/**").hasRole("ADMIN")

                        // Everything else requires authentication
                        .anyRequest().authenticated()
                )

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                writeError(
                                        response,
                                        HttpServletResponse.SC_UNAUTHORIZED,
                                        "UNAUTHORIZED",
                                        "Authentication required."
                                )
                        )
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                writeError(
                                        response,
                                        HttpServletResponse.SC_FORBIDDEN,
                                        "FORBIDDEN",
                                        "You do not have access to this resource."
                                )
                        )
                )

                .addFilterBefore(
                        jwtFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .addFilterBefore(cookieOriginGuardFilter, JwtFilter.class);

        return http.build();
    }

    /**
     * Prevent Spring Boot from registering JwtFilter as a separate
     * servlet filter. It should run only inside the Spring Security chain.
     */
    @Bean
    public FilterRegistrationBean<JwtFilter> jwtFilterRegistration(JwtFilter filter) {

        FilterRegistrationBean<JwtFilter> registration =
                new FilterRegistrationBean<>(filter);

        registration.setEnabled(false);

        return registration;
    }

    @Bean
    public FilterRegistrationBean<CookieOriginGuardFilter> cookieOriginGuardRegistration(CookieOriginGuardFilter filter) {
        FilterRegistrationBean<CookieOriginGuardFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    private void writeError(
            HttpServletResponse response,
            int status,
            String code,
            String message
    ) throws java.io.IOException {

        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        objectMapper.writeValue(
                response.getWriter(),
                Map.of(
                        "code", code,
                        "message", message
                )
        );
    }
}
