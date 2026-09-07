package org.example.repository;

import org.example.entity.Call;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CallRepository extends JpaRepository<Call, Long> {
}