package be.pxl.healthcareapi;
import java.security.SecureRandom;
import java.util.Base64;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HealthcareApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(HealthcareApiApplication.class, args);}
}
