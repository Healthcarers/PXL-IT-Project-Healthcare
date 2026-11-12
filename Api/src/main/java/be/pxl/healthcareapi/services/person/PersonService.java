package be.pxl.healthcareapi.services.person;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.PersonIdRequest;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.exception.NotFoundException;
import be.pxl.healthcareapi.repos.PersonRepo;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class PersonService {
    private final PersonRepo personRepo;

    public PersonService(PersonRepo personRepo){
        this.personRepo = personRepo;
    }

    public Person getPersonByUUID(PersonIdRequest request){
        UUID uuid = UUID.fromString(request.uuid());
        Optional<Person> personOptional = personRepo.findById(uuid);

        if (personOptional.isEmpty()){
            throw new NotFoundException("Deze gebruiker kon niet gevonden worden");
        }

        return personOptional.get();
    }

    //TODO moet in securityFilterChain gedaan worden
    @PreAuthorize("hasRole('ADMIN')")
    public void deletePerson(PersonIdRequest personIdRequest){
        Person personToDelete = getPersonByUUID(personIdRequest);

        if (personToDelete.getRole() == Role.ADMIN){
            throw new BadRequestException("Deze gebruiker kan je niet verwijderen");
        }
        personRepo.delete(personToDelete);
    }


}

