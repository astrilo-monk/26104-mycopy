package org.example.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "calls")
public class Call {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "call_id", unique = true, nullable = false)
    private String callId;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "status")
    private String status;

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public String getCallId() {
        return callId;
    }

    public void setCallId(String callId) {
        this.callId = callId;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}