package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.DTO.AuthResponse;
import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.PersonDetails;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.repos.PersonRepo;
import be.pxl.healthcareapi.services.Authentication.JwtService;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class PersonService {
    private final PersonRepo personRepo;
    private final JwtService jwtService;

    public PersonService(PersonRepo personRepo, JwtService jwtService){
        this.personRepo = personRepo;
        this.jwtService = jwtService;
    }

    public AuthResponse getPersonFromUUID(String token){
        UUID uuid = jwtService.extractUserId(token);
        Optional<Person> personOptional = personRepo.getPersonById(uuid);
        if (personOptional.isEmpty()){
            throw new BadRequestException("Deze persoon bestaat niet");
        }
        return new AuthResponse(personOptional.get().getFirstname(), personOptional.get().getLastname());
    }
}
