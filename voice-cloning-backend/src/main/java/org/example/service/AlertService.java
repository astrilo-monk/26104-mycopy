package org.example.service;

import org.example.entity.Alert;
import org.example.repository.AlertRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AlertService {

    private final AlertRepository alertRepository;

    public AlertService(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    public Alert createAlert(
            String callId,
            String riskLevel) {

        Alert alert = new Alert();

        alert.setCallId(callId);
        alert.setRiskLevel(riskLevel);

        if (riskLevel.equals("HIGH")) {
            alert.setMessage("Potential voice cloning attack detected");
            alert.setAction("Additional verification required");
        } else if (riskLevel.equals("MEDIUM")) {
            alert.setMessage("Suspicious voice activity detected");
            alert.setAction("Monitor call");
        } else {
            alert.setMessage("No significant risk detected");
            alert.setAction("No action required");
        }

        alert.setStatus("OPEN");
        alert.setCreatedAt(LocalDateTime.now());

        return alertRepository.save(alert);
    }
}