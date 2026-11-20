package be.pxl.healthcareapi.services.admin;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.AdminAccountResponse;
import be.pxl.healthcareapi.dto.AdminStatsResponse;
import be.pxl.healthcareapi.dto.PersonIdRequest;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.repositories.AccessTokenRepository;
import be.pxl.healthcareapi.repositories.PersonRepository;
import be.pxl.healthcareapi.repositories.RefreshTokenRepository;
import be.pxl.healthcareapi.services.person.PersonService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
public class AdminService {
    private final PersonRepository personRepo;
    private final RefreshTokenRepository refreshTokenRepo;
    private final PersonService personService;
    private final AccessTokenRepository accessTokenRepository;

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
        accessTokenRepository.deleteAllByPerson(personToDelete);
        personRepo.delete(personToDelete);
    }
}
