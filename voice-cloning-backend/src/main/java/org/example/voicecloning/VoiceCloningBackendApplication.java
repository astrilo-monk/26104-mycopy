package org.example.voicecloning;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "org.example")
@EnableJpaRepositories(basePackages = "org.example.repository")
@EntityScan(basePackages = "org.example.entity")
public class VoiceCloningBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(VoiceCloningBackendApplication.class, args);
    }
}