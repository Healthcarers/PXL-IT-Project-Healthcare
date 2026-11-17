package be.pxl.healthcareapi.repositories;

import be.pxl.healthcareapi.domein.Person;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PersonRepository extends JpaRepository<Person, UUID> {
}