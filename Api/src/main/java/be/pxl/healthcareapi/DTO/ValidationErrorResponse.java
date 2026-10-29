package be.pxl.healthcareapi.DTO;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class ValidationErrorResponse {
    private int status;
    private String message;
    private Map<String, String> errors;

    public ValidationErrorResponse(int status, String message, Map<String, String> errors) {
        this.status = status;
        this.message = message;
        this.errors = errors;
    }
}