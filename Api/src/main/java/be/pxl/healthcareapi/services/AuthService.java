package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.DTO.RegisterRequest;
import be.pxl.healthcareapi.DTO.RegisterResponse;
import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.repos.PersonRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final PersonRepo userRepo;

    private PasswordEncoder passwordEncoder;

    public AuthService(PersonRepo userRepo, PasswordEncoder passwordEncoder){
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    public RegisterResponse registerUser(RegisterRequest request) {
        String hashedPassword = passwordEncoder.encode(request.password());

        Person user = new Person(request.firstname(), request.lastname(), request.email(), hashedPassword);

        userRepo.save(user);

        return new RegisterResponse("Account for " + user.getFirstname() + " " + user.getLastname() + " has been registered.");
    }
}
