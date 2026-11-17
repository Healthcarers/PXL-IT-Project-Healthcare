package be.pxl.healthcareapi.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler =
            new GlobalExceptionHandler();

    @Test
    void illegalStateException_returnsConflict() {
        IllegalStateException exception =
                new IllegalStateException("Deze room is niet meer beschikbaar.");

        var response = handler.handleIllegalStateException(exception);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals(
                "Deze room is niet meer beschikbaar.",
                response.getBody()
        );
    }

    @Test
    void illegalArgumentException_returnsBadRequest() {
        IllegalArgumentException exception =
                new IllegalArgumentException("Ongeldige invoer.");

        var response = handler.handleIllegalArgumentException(exception);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Ongeldige invoer.", response.getBody());
    }

    @Test
    void notFoundException_returnsNotFound() {
        NotFoundException exception =
                new NotFoundException("Room niet gevonden.");

        var response = handler.handleNotFoundException(exception);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Room niet gevonden.", response.getBody());
    }
}