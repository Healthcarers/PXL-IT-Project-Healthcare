package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.dto.VitalsResponse;
import be.pxl.healthcareapi.dto.VitalsUpdateRequest;
import be.pxl.healthcareapi.services.VitalsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vitals")
@CrossOrigin("*")
public class VitalsController {
    private final VitalsService vitalsService;

    public VitalsController(VitalsService vitalsService) {
        this.vitalsService = vitalsService;
    }

    @GetMapping
    public ResponseEntity<VitalsResponse> get() {
        return new ResponseEntity<>(VitalsResponse.from(vitalsService.get()), HttpStatus.OK);
    }

    @PatchMapping
    public ResponseEntity<VitalsResponse> update(@RequestBody VitalsUpdateRequest request) {
        return new  ResponseEntity<>(VitalsResponse.from(vitalsService.update(request)), HttpStatus.OK);
    }
}
