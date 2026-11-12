
package com.irctc.irctcbackend.email;

import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.Passenger;
import jakarta.mail.MessagingException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final String BREVO_API_URL =
            "https://api.brevo.com/v3/smtp/email";

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String provider;
    private final String brevoApiKey;
    private final RestClient restClient;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${railgpt.mail.from-address:${spring.mail.username:}}")
            String fromAddress,
            @Value("${railgpt.email.provider:gmail}")
            String provider,
            @Value("${railgpt.brevo.api-key:}")
            String brevoApiKey
    ) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.provider = provider;
        this.brevoApiKey = brevoApiKey;
        this.restClient = RestClient.create();
    }

    public void sendTestEmail(String recipient) {
        sendEmail(
                recipient,
                "RailGPT - Email Configuration Test",
                "Hello!\n\n" +
                        "Your RailGPT email configuration is working successfully.\n\n" +
                        "RailGPT Team",
                null,
                null
        );
    }

    public void sendRegistrationOtp(String recipient, String otp) {
        String body =
                "Hello!\n\n" +
                        "Welcome to RailGPT!\n\n" +
                        "Your email verification OTP is: " + otp + "\n\n" +
                        "This OTP is valid for 5 minutes.\n" +
                        "Do not share this OTP with anyone.\n\n" +
                        "If you did not request this verification, please ignore this email.\n\n" +
                        "Regards,\n" +
                        "RailGPT Team";

        sendEmail(
                recipient,
                "RailGPT - Email Verification OTP",
                body,
                null,
                null
        );
    }

    public void sendBookingEventEmail(
            Booking booking,
            String recipient,
            String eventType,
            String statusSnapshot,
            byte[] ticketPdf
    ) {
        String status = "CURRENT".equals(statusSnapshot)
                ? booking.getStatus()
                : statusSnapshot;

        String displayStatus = displayStatus(status);

        String subject = subject(
                eventType,
                displayStatus,
                booking.getPnr()
        );

        String body = bookingEventBody(
                booking,
                eventType,
                displayStatus
        );

        String attachmentName = ticketPdf == null
                ? null
                : "RailGPT-ticket-" + booking.getPnr() + ".pdf";

        sendEmail(
                recipient,
                subject,
                body,
                attachmentName,
                ticketPdf
        );
    }

    private void sendEmail(
            String recipient,
            String subject,
            String body,
            String attachmentName,
            byte[] attachment
    ) {
        if (recipient == null || recipient.isBlank()) {
            throw new IllegalArgumentException(
                    "Email recipient cannot be empty."
            );
        }

        if (fromAddress == null || fromAddress.isBlank()) {
            throw new IllegalStateException(
                    "RailGPT sender email is not configured."
            );
        }

        if ("brevo".equalsIgnoreCase(provider)) {
            sendViaBrevo(
                    recipient,
                    subject,
                    body,
                    attachmentName,
                    attachment
            );
        } else if ("gmail".equalsIgnoreCase(provider)) {
            sendViaGmail(
                    recipient,
                    subject,
                    body,
                    attachmentName,
                    attachment
            );
        } else {
            throw new IllegalStateException(
                    "Unsupported email provider: " + provider
            );
        }
    }

    private void sendViaGmail(
            String recipient,
            String subject,
            String body,
            String attachmentName,
            byte[] attachment
    ) {
        try {
            if (attachment == null) {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromAddress);
                message.setTo(recipient);
                message.setSubject(subject);
                message.setText(body);

                mailSender.send(message);
                return;
            }

            var message = mailSender.createMimeMessage();

            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    true,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(fromAddress);
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(body, false);

            helper.addAttachment(
                    attachmentName,
                    new ByteArrayResource(attachment),
                    "application/pdf"
            );

            mailSender.send(message);

        } catch (MessagingException ex) {
            throw new IllegalStateException(
                    "Unable to prepare the Gmail notification email.",
                    ex
            );
        }
    }

    private void sendViaBrevo(
            String recipient,
            String subject,
            String body,
            String attachmentName,
            byte[] attachment
    ) {
        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            throw new IllegalStateException(
                    "BREVO_API_KEY is not configured."
            );
        }

        Map<String, Object> sender = Map.of(
                "name", "RailGPT",
                "email", fromAddress
        );

        Map<String, Object> recipientDetails = Map.of(
                "email", recipient
        );

        Map<String, Object> payload = new LinkedHashMap<>();

        payload.put("sender", sender);
        payload.put("to", List.of(recipientDetails));
        payload.put("subject", subject);
        payload.put("textContent", body);

        if (attachment != null && attachmentName != null) {
            Map<String, Object> attachmentDetails = Map.of(
                    "name", attachmentName,
                    "content", Base64.getEncoder()
                            .encodeToString(attachment)
            );

            payload.put(
                    "attachment",
                    List.of(attachmentDetails)
            );
        }

        try {
            restClient.post()
                    .uri(BREVO_API_URL)
                    .header("api-key", brevoApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

        } catch (Exception ex) {
            // Never log the API key or email OTP.
            throw new IllegalStateException(
                    "Brevo email delivery failed. Check the production email configuration and provider logs.",
                    ex
            );
        }
    }

    private String subject(
            String eventType,
            String status,
            String pnr
    ) {
        return switch (eventType) {
            case "CANCELLED" ->
                    "RailGPT booking cancelled - PNR " + pnr;

            case "STATUS_CHANGE" ->
                    "RailGPT journey status: " + status + " - PNR " + pnr;

            default ->
                    "RailGPT booking received - " + status + " - PNR " + pnr;
        };
    }

    private String displayStatus(String status) {
        return switch (status) {
            case "CONFIRMED" -> "Confirmed";
            case "RAC" -> "RAC queue";
            case "WL" -> "Waiting list";
            case "PARTIAL" -> "Partially confirmed";
            case "CANCELLED" -> "Cancelled";
            default -> status;
        };
    }

    private String bookingEventBody(
            Booking booking,
            String eventType,
            String status
    ) {
        String introduction = switch (eventType) {
            case "CANCELLED" ->
                    "Your booking has been cancelled. The details are included below for your records.";

            case "STATUS_CHANGE" ->
                    "There has been an update to your booking. The status shown here is the status recorded when this notification was queued.";

            default ->
                    "Your RailGPT booking has been received. Your ticket PDF is attached when available.";
        };

        StringBuilder text = new StringBuilder()
                .append("Hello,\n\n")
                .append(introduction).append("\n\n")
                .append("PNR: ").append(booking.getPnr()).append('\n')
                .append("Status: ").append(status).append('\n')
                .append("Train: ").append(booking.getTrainNumber())
                .append(" - ").append(booking.getTrainName()).append('\n')
                .append("Route: ").append(booking.getSource())
                .append(" to ").append(booking.getDestination()).append('\n')
                .append("Boarding: ").append(booking.getBoarding())
                .append(" | Reservation: ").append(booking.getReservation()).append('\n')
                .append("Journey date: ").append(booking.getJourneyDate()).append('\n')
                .append("Class: ").append(booking.getClassType()).append('\n')
                .append("Total fare: INR ").append(booking.getTotalFare())
                .append("\n\nPassengers:\n");

        for (Passenger passenger : booking.getPassengers()) {
            text.append("- ")
                    .append(passenger.getName())
                    .append(" (age ")
                    .append(passenger.getAge())
                    .append(", ")
                    .append(passenger.getGender())
                    .append(") - ")
                    .append(passenger.getStatus());

            if ("CONFIRMED".equals(passenger.getStatus())) {
                text.append(" - ")
                        .append(passenger.getCoachNumber())
                        .append(" / seat ")
                        .append(passenger.getSeatNumber())
                        .append(" / ")
                        .append(passenger.getBerthType());

            } else if ("RAC".equals(passenger.getStatus())) {
                text.append(" - RAC ")
                        .append(passenger.getRacNumber());

            } else if ("WL".equals(passenger.getStatus())) {
                text.append(" - waiting list ")
                        .append(passenger.getWaitingNumber());
            }

            text.append('\n');
        }

        if ("CANCELLED".equals(eventType)) {
            text.append(
                    "\nNo further action is needed for this cancelled booking.\n"
            );
        }

        return text.append(
                "\nThis is an illustrative RailGPT booking, not an IRCTC-issued ticket. No payment was processed.\n"
        ).toString();
    }
}
