package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.dto.PersonIdRequest;
import jakarta.validation.Valid;
import be.pxl.healthcareapi.dto.AdminAccountResponse;
import be.pxl.healthcareapi.dto.AdminStatsResponse;
import be.pxl.healthcareapi.services.admin.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;

    public AdminController (AdminService adminService){
        this.adminService = adminService;
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsResponse> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    @GetMapping("/accounts")
    public ResponseEntity<List<AdminAccountResponse>> getAccounts() {
        return ResponseEntity.ok(adminService.getAccounts());
    }

    @DeleteMapping("/delete")
    public ResponseEntity<Void> deletePerson(@Valid @RequestBody PersonIdRequest personIdRequest){
        adminService.deletePerson(personIdRequest);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/changeRole")
    public ResponseEntity<Void> changePersonRole(@Valid @RequestBody PersonIdRequest personIdRequest){
        adminService.setPersonRole(personIdRequest);
        return ResponseEntity.ok().build();
    }
}
