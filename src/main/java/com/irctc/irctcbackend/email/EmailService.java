
package com.irctc.irctcbackend.email;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.Passenger;

import jakarta.mail.MessagingException;
import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public EmailService(JavaMailSender mailSender,
                        @Value("${spring.mail.username:}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    public void sendTestEmail(String recipient) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromAddress);
        message.setTo(recipient);
        message.setSubject("RailGPT - Email Configuration Test");
        message.setText(
                "Hello!\n\n" +
                        "Your Gmail SMTP configuration is working successfully.\n\n" +
                        "RailGPT Team"
        );

        mailSender.send(message);
    }

    public void sendRegistrationOtp(String recipient, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromAddress);
        message.setTo(recipient);
        message.setSubject("RailGPT - Email Verification OTP");

        message.setText(
                "Hello!\n\n" +
                        "Welcome to RailGPT!\n\n" +
                        "Your email verification OTP is: " + otp + "\n\n" +
                        "This OTP is valid for 5 minutes.\n" +
                        "Do not share this OTP with anyone.\n\n" +
                        "If you did not request this verification, please ignore this email.\n\n" +
                        "Regards,\n" +
                        "RailGPT Team"
        );

        mailSender.send(message);
    }

    public void sendBookingEventEmail(Booking booking, String recipient, String eventType, String statusSnapshot, byte[] ticketPdf) {
        try {
            var message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(recipient);
            String status = "CURRENT".equals(statusSnapshot) ? booking.getStatus() : statusSnapshot;
            String displayStatus = displayStatus(status);
            helper.setSubject(subject(eventType, displayStatus, booking.getPnr()));
            helper.setText(bookingEventBody(booking, eventType, displayStatus), false);
            if (ticketPdf != null) {
                helper.addAttachment("RailGPT-ticket-" + booking.getPnr() + ".pdf",
                        new ByteArrayResource(ticketPdf), "application/pdf");
            }
            mailSender.send(message);
        } catch (MessagingException ex) {
            throw new IllegalStateException("Unable to prepare the booking notification email.", ex);
        }
    }

    private String subject(String eventType, String status, String pnr) {
        return switch (eventType) {
            case "CANCELLED" -> "RailGPT booking cancelled - PNR " + pnr;
            case "STATUS_CHANGE" -> "RailGPT journey status: " + status + " - PNR " + pnr;
            default -> "RailGPT booking received - " + status + " - PNR " + pnr;
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

    private String bookingEventBody(Booking booking, String eventType, String status) {
        String introduction = switch (eventType) {
            case "CANCELLED" -> "Your booking has been cancelled. The details are included below for your records.";
            case "STATUS_CHANGE" -> "There has been an update to your booking. The status shown here is the status recorded when this notification was queued.";
            default -> "Your RailGPT booking has been received. Your ticket PDF is attached when available.";
        };
        StringBuilder text = new StringBuilder()
                .append("Hello,\n\n")
                .append(introduction).append("\n\n")
                .append("PNR: ").append(booking.getPnr()).append('\n')
                .append("Status: ").append(status).append('\n')
                .append("Train: ").append(booking.getTrainNumber()).append(" - ").append(booking.getTrainName()).append('\n')
                .append("Route: ").append(booking.getSource()).append(" to ").append(booking.getDestination()).append('\n')
                .append("Boarding: ").append(booking.getBoarding()).append(" | Reservation: ").append(booking.getReservation()).append('\n')
                .append("Journey date: ").append(booking.getJourneyDate()).append('\n')
                .append("Class: ").append(booking.getClassType()).append('\n')
                .append("Total fare: INR ").append(booking.getTotalFare()).append("\n\nPassengers:\n");
        for (Passenger passenger : booking.getPassengers()) {
            text.append("- ").append(passenger.getName()).append(" (age ").append(passenger.getAge())
                    .append(", ").append(passenger.getGender()).append(") - ")
                    .append(passenger.getStatus());
            if ("CONFIRMED".equals(passenger.getStatus())) {
                text.append(" - ").append(passenger.getCoachNumber()).append(" / seat ").append(passenger.getSeatNumber())
                        .append(" / ").append(passenger.getBerthType());
            } else if ("RAC".equals(passenger.getStatus())) {
                text.append(" - RAC ").append(passenger.getRacNumber());
            } else if ("WL".equals(passenger.getStatus())) {
                text.append(" - waiting list ").append(passenger.getWaitingNumber());
            }
            text.append('\n');
        }
        if ("CANCELLED".equals(eventType)) {
            text.append("\nNo further action is needed for this cancelled booking.\n");
        }
        return text.append("\nThis is an illustrative RailGPT booking, not an IRCTC-issued ticket. No payment was processed.\n")
                .toString();
    }
}
