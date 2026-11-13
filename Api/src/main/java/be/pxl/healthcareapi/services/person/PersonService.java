package be.pxl.healthcareapi.services.person;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.dto.PersonIdRequest;
import be.pxl.healthcareapi.exception.NotFoundException;
import be.pxl.healthcareapi.repos.PersonRepo;
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

}

