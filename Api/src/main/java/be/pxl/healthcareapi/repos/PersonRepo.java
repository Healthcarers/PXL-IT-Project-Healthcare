package be.pxl.healthcareapi.repos;

import be.pxl.healthcareapi.domein.Person;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PersonRepo extends JpaRepository<Person, UUID> {
}
