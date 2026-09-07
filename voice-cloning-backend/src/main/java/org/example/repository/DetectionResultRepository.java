package org.example.repository;

import org.example.entity.DetectionResult;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DetectionResultRepository extends JpaRepository<DetectionResult, Long> {
}
