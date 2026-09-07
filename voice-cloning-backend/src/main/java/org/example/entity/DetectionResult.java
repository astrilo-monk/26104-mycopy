package org.example.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "detection_results")
public class DetectionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "call_id")
    private String callId;

    @Column(name = "chunk_id")
    private Integer chunkId;

    @Column(name = "model_score")
    private Double modelScore;

    @Column(name = "spoof_probability")
    private Double spoofProbability;

    @Column(name = "risk_score")
    private Double riskScore;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "model_version")
    private String modelVersion;

    public Long getId() {
        return id;
    }

    public String getCallId() {
        return callId;
    }

    public void setCallId(String callId) {
        this.callId = callId;
    }

    public Integer getChunkId() {
        return chunkId;
    }

    public void setChunkId(Integer chunkId) {
        this.chunkId = chunkId;
    }

    public Double getModelScore() {
        return modelScore;
    }

    public void setModelScore(Double modelScore) {
        this.modelScore = modelScore;
    }

    public Double getSpoofProbability() {
        return spoofProbability;
    }

    public void setSpoofProbability(Double spoofProbability) {
        this.spoofProbability = spoofProbability;
    }

    public Double getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(Double riskScore) {
        this.riskScore = riskScore;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }
}