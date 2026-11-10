package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.Passenger;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class TicketPdfService {

    public byte[] createTicket(Booking booking) {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            List<String> lines = wrap(ticketLines(booking));
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            float y = page.getMediaBox().getHeight() - 54;

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 18);
                content.newLineAtOffset(48, y);
                content.showText("RailGPT - Journey Ticket");
                content.endText();
                y -= 34;

                for (int i = 0; i < lines.size(); i++) {
                    content.beginText();
                    content.setFont(new PDType1Font(i == 0
                            ? Standard14Fonts.FontName.HELVETICA_BOLD
                            : Standard14Fonts.FontName.HELVETICA), 11);
                    content.newLineAtOffset(48, y);
                    content.showText(ascii(lines.get(i)));
                    content.endText();
                    y -= 19;
                }
            }
            document.save(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to create the ticket PDF.", ex);
        }
    }

    private List<String> ticketLines(Booking booking) {
        List<String> lines = new ArrayList<>();
        lines.add("PNR: " + booking.getPnr());
        lines.add("Booking status: " + booking.getStatus());
        lines.add("Train: " + booking.getTrainNumber() + " - " + booking.getTrainName());
        lines.add("Route: " + booking.getSource() + " to " + booking.getDestination());
        lines.add("Journey date: " + booking.getJourneyDate());
        lines.add("Class: " + booking.getClassType());
        lines.add("Boarding: " + safe(booking.getBoarding()) + "    Reservation: " + safe(booking.getReservation()));
        lines.add("Total fare: INR " + booking.getTotalFare());
        lines.add("");
        lines.add("PASSENGERS");
        for (Passenger passenger : booking.getPassengers()) {
            String place = switch (passenger.getStatus()) {
                case "CONFIRMED" -> safe(passenger.getCoachNumber()) + " / Seat " + safe(passenger.getSeatNumber())
                        + " / " + safe(passenger.getBerthType());
                case "RAC" -> "RAC " + safe(passenger.getRacNumber());
                case "WL" -> "Waiting list " + safe(passenger.getWaitingNumber());
                default -> "Cancelled";
            };
            lines.add(passenger.getName() + " | Age " + passenger.getAge() + " | " + passenger.getGender()
                    + " | " + passenger.getStatus() + " | " + place);
        }
        lines.add("");
        lines.add("Illustrative RailGPT booking. This is not an IRCTC-issued ticket.");
        lines.add("No payment was processed.");
        return lines;
    }

    private String safe(Object value) {
        return value == null ? "-" : value.toString();
    }

    private String ascii(String text) {
        return text.replaceAll("[^\\x20-\\x7E]", "?");
    }

    private List<String> wrap(List<String> source) {
        List<String> result = new ArrayList<>();
        for (String line : source) {
            String remaining = line;
            while (remaining.length() > 88) {
                int split = remaining.lastIndexOf(' ', 88);
                if (split < 1) split = 88;
                result.add(remaining.substring(0, split));
                remaining = remaining.substring(split).stripLeading();
            }
            result.add(remaining);
        }
        return result;
    }
}
