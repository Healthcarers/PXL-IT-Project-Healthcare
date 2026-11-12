package be.pxl.healthcareapi.services.admin;

import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.AdminStatsResponse;
import be.pxl.healthcareapi.repos.PersonRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminService {
    private final PersonRepo personRepo;

    @PreAuthorize("hasRole('ADMIN')")
    public AdminStatsResponse getStats() {
        long totalAccounts = personRepo.count();
        long lectoren = personRepo.countByRole(Role.LECTOR);
        long cursisten = personRepo.countByRole(Role.CURSIST);

        return new AdminStatsResponse(totalAccounts, lectoren, cursisten);
    }
}
