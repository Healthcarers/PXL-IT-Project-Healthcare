package be.pxl.healthcareapi.repositories;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PersonRepository extends JpaRepository<Person, UUID> {
    Optional<Person> getPersonByEmail(String email);

    Optional<Person> getPersonById(UUID id);

    long countByRole(Role role);
}
