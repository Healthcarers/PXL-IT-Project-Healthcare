package be.pxl.healthcareapi.services.admin;

import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.AdminStatsResponse;
import be.pxl.healthcareapi.repos.PersonRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTests {

    @Mock
    private PersonRepo personRepo;

    @InjectMocks
    private AdminService adminService;

    @Test
    void getStats_ShouldReturnLiveCountsFromPersonRepo() {
        when(personRepo.count()).thenReturn(15L);
        when(personRepo.countByRole(Role.LECTOR)).thenReturn(3L);
        when(personRepo.countByRole(Role.CURSIST)).thenReturn(11L);

        AdminStatsResponse result = adminService.getStats();

        assertEquals(15L, result.totalAccounts());
        assertEquals(3L, result.lectoren());
        assertEquals(11L, result.cursisten());
    }
}
