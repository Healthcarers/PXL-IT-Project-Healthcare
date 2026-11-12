package be.pxl.healthcareapi.dto;

import be.pxl.healthcareapi.domein.enums.Role;

public record AuthResponse (String firstname, String lastname, Role role){
}
