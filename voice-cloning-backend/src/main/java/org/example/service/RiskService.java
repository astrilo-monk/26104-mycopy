package org.example.service;

import org.springframework.stereotype.Service;

@Service
public class RiskService {

    public double calculateRisk(double spoofProbability) {

        return spoofProbability * 100;
    }

    public String determineRiskLevel(double riskScore) {

        if (riskScore >= 80) {
            return "HIGH";
        } else if (riskScore >= 50) {
            return "MEDIUM";
        } else {
            return "LOW";
        }
    }
}
