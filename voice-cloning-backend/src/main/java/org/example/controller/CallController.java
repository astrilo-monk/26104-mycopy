package org.example.controller;

import org.example.entity.Call;
import org.example.repository.CallRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/calls")
public class CallController {

    private final CallRepository callRepository;

    public CallController(CallRepository callRepository) {
        this.callRepository = callRepository;
    }

    @GetMapping
    public List<Call> getAllCalls() {
        return callRepository.findAll();
    }
}
