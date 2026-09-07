package org.example.controller;

import org.example.entity.DetectionResult;
import org.example.repository.DetectionResultRepository;
import org.example.service.AlertService;
import org.example.service.RiskService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/detections")
public class DetectionController {

    private final DetectionResultRepository detectionResultRepository;
    private final RiskService riskService;
    private final AlertService alertService;

    public DetectionController(
            DetectionResultRepository detectionResultRepository,
            RiskService riskService,
            AlertService alertService) {

        this.detectionResultRepository = detectionResultRepository;
        this.riskService = riskService;
        this.alertService = alertService;
    }

    @GetMapping
    public List<DetectionResult> getAllDetections() {
        return detectionResultRepository.findAll();
    }

    @PostMapping
    public DetectionResult createDetection(@RequestBody DetectionResult detectionResult) {

        double riskScore =
                riskService.calculateRisk(detectionResult.getSpoofProbability());

        String riskLevel =
                riskService.determineRiskLevel(riskScore);

        detectionResult.setRiskScore(riskScore);
        detectionResult.setRiskLevel(riskLevel);

        if (riskLevel.equals("HIGH")) {
            alertService.createAlert(
                    detectionResult.getCallId(),
                    riskLevel
            );
        }

        return detectionResultRepository.save(detectionResult);
    }
}