package be.pxl.healthcareapi.services.admin;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.AdminAccountResponse;
import be.pxl.healthcareapi.dto.AdminStatsResponse;
import be.pxl.healthcareapi.dto.PersonIdRequest;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.repos.PersonRepo;
import be.pxl.healthcareapi.repos.RefreshTokenRepo;
import be.pxl.healthcareapi.services.person.PersonService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {
    private final PersonRepo personRepo;
    private final RefreshTokenRepo refreshTokenRepo;
    private final PersonService personService;

    public AdminService(PersonRepo personRepo, RefreshTokenRepo refreshTokenRepo, PersonService personService) {
        this.personRepo = personRepo;
        this.refreshTokenRepo = refreshTokenRepo;
        this.personService = personService;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public AdminStatsResponse getStats() {
        long totalAccounts = personRepo.count();
        long lectoren = personRepo.countByRole(Role.LECTOR);
        long cursisten = personRepo.countByRole(Role.CURSIST);

        return new AdminStatsResponse(totalAccounts, lectoren, cursisten);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminAccountResponse> getAccounts() {
        return personRepo.findAll().stream()
                .filter(person -> person.getRole() != Role.ADMIN)
                .map(person -> new AdminAccountResponse(
                        person.getId(),
                        person.getFirstname(),
                        person.getLastname(),
                        person.getEmail(),
                        person.getRole(),
                        person.getCreatedAt()
                ))
                .toList();
    }

    //TODO moet in securityFilterChain gedaan worden
    @PreAuthorize("hasRole('ADMIN')")
    public void setPersonRole(PersonIdRequest personIdRequest){
        Person personToChange = personService.getPersonByUUID(personIdRequest);
        if (personToChange.getRole() == Role.ADMIN){
            throw new BadRequestException("Admin role kan niet veranderd worden");
        }
        else if (personToChange.getRole() == Role.CURSIST){
            personToChange.changeRole(Role.LECTOR);
        }
        else {
            personToChange.changeRole(Role.CURSIST);
        }
        personRepo.save(personToChange);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void deletePerson(PersonIdRequest personIdRequest) {
        Person personToDelete = personService.getPersonByUUID(personIdRequest);

        if (personToDelete.getRole() == Role.ADMIN) {
            throw new BadRequestException("Deze gebruiker kan je niet verwijderen");
        }

        refreshTokenRepo.deleteAllByPerson(personToDelete);
        personRepo.delete(personToDelete);
    }
}
