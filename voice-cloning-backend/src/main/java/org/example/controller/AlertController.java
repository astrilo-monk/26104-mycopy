package org.example.controller;

import org.example.entity.Alert;
import org.example.repository.AlertRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/alerts")
public class AlertController {

    private final AlertRepository alertRepository;

    public AlertController(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    @GetMapping
    public List<Alert> getAllAlerts() {
        return alertRepository.findAll();
    }

    @PostMapping
    public Alert createAlert(@RequestBody Alert alert) {
        return alertRepository.save(alert);
    }
}
