package com.irctc.irctcbackend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "trains")
public class Train {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String trainNumber;

    private String trainName;

    private String source;

    private String destination;

    private Integer totalSeats;

    private Integer availableSeats = 1000;

    private Integer racLimit = 50;

    private Integer waitingLimit = 100;

    // GETTERS AND SETTERS

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTrainNumber() {
        return trainNumber;
    }

    public void setTrainNumber(String trainNumber) {
        this.trainNumber = trainNumber;
    }

    public String getTrainName() {
        return trainName;
    }

    public void setTrainName(String trainName) {
        this.trainName = trainName;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public Integer getTotalSeats() {
        return totalSeats;
    }

    public void setTotalSeats(Integer totalSeats) {
        this.totalSeats = totalSeats;
    }

    public Integer getAvailableSeats() {
        return availableSeats;
    }

    public void setAvailableSeats(Integer availableSeats) {
        this.availableSeats = availableSeats;
    }

    public Integer getRacLimit() {
        return racLimit;
    }

    public void setRacLimit(Integer racLimit) {
        this.racLimit = racLimit;
    }

    public Integer getWaitingLimit() {
        return waitingLimit;
    }

    public void setWaitingLimit(Integer waitingLimit) {
        this.waitingLimit = waitingLimit;
    }
}