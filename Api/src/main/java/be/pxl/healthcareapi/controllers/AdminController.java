package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.dto.PersonIdRequest;
import be.pxl.healthcareapi.services.person.PersonService;
import jakarta.validation.Valid;
import be.pxl.healthcareapi.dto.AdminAccountResponse;
import be.pxl.healthcareapi.dto.AdminStatsResponse;
import be.pxl.healthcareapi.services.admin.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;
    private final PersonService personService;

    public AdminController (PersonService personService, AdminService adminService){
        this.personService = personService;
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
        personService.deletePerson(personIdRequest);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/changeRole")
    public ResponseEntity<Void> changeRoleToLector(@Valid @RequestBody PersonIdRequest personIdRequest){
        adminService.setPersonRole(personIdRequest);
        return ResponseEntity.ok().build();
    }
}
