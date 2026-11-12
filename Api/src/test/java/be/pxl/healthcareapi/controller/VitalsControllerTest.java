package be.pxl.healthcareapi.controller;

import be.pxl.healthcareapi.controllers.VitalsController;
import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.services.VitalsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VitalsController.class)
@AutoConfigureMockMvc(addFilters = false)
public class VitalsControllerTest {
    @Autowired MockMvc mvc;

    @MockitoBean VitalsService vitalsService;

    @Test
    void getReturnsVitalsAsJson() throws Exception {
        when(vitalsService.get()).thenReturn(new VitalsSnapshot(75, 98, 1.0));

        mvc.perform(get("/api/vitals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.heartRate").value(75.0))
                .andExpect(jsonPath("$.ampScale").value(1.0));
    }

    @Test
    void patchPassesOnlyTheProvidedFields() throws Exception {
        when(vitalsService.update(any())).thenReturn(new VitalsSnapshot(120, 98, 1.0));

        mvc.perform(patch("/api/vitals")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"heartRate\":120}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.heartRate").value(120.0));

        verify(vitalsService).update(argThat(req ->
            Double.valueOf(120).equals(req.heartRate())
                && req.ampScale() == null));
    }

    @Test
    void serviceValidationErrorBecomesBadRequest() throws Exception {
        when(vitalsService.update(any()))
                .thenThrow(new IllegalArgumentException("heartRate must be between 20.0 and 220.0"));

        mvc.perform(patch("/api/vitals")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"hearRate\":999}"))
                .andExpect(status().isBadRequest());
    }
}
