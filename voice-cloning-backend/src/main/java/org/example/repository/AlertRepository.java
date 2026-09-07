package org.example.repository;

import org.example.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertRepository extends JpaRepository<Alert, Long> {
}