package be.pxl.healthcareapi.controllers;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ScenarioControllerTest {
    private static final String SCENARIOS = "/api/scenarios";
    private static final String SCENARIO = """
            {
                "name": "Monitorsimulatie",
                "description": "Oefenen met de trainingsmonitor.",
                "initialVitals": {
                    "heartRate": 105, "spo2": 94, "respRate": 20, "etco2": 36,
                    "ampScale": 1.2, "sysBp": 118, "diasBp": 76
                },
                "feedbackItems": ["Monitor gecontroleerd", "Observaties gerapporteerd"]
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void storesScenarioAndManualEvaluationWithoutChangingLiveVitals() throws Exception {
        var lector = auth("LECTOR", UUID.randomUUID());
        var liveVitals = mockMvc.perform(get("/api/vitals")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        var scenarioId = createScenario(lector);

        mockMvc.perform(get(SCENARIOS).with(lector))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(scenarioId)));
        mockMvc.perform(get(SCENARIOS + "/{id}", scenarioId).with(lector))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Monitorsimulatie"))
                .andExpect(jsonPath("$.description").value("Oefenen met de trainingsmonitor."))
                .andExpect(jsonPath("$.initialVitals.heartRate").value(105))
                .andExpect(jsonPath("$.initialVitals.spo2").value(94))
                .andExpect(jsonPath("$.initialVitals.respRate").value(20))
                .andExpect(jsonPath("$.initialVitals.etco2").value(36))
                .andExpect(jsonPath("$.initialVitals.ampScale").value(1.2))
                .andExpect(jsonPath("$.initialVitals.sysBp").value(118))
                .andExpect(jsonPath("$.initialVitals.diasBp").value(76))
                .andExpect(jsonPath("$.feedbackItems[0]").value("Monitor gecontroleerd"))
                .andExpect(jsonPath("$.feedbackItems[1]").value("Observaties gerapporteerd"));

        var evaluation = mockMvc.perform(post(SCENARIOS + "/{id}/evaluations", scenarioId).with(lector)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"results\":[true,false]}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        var evaluationId = objectMapper.readTree(evaluation).path("id").asString();
        var evaluationPath = SCENARIOS + "/{id}/evaluations/{evaluationId}";

        mockMvc.perform(get(evaluationPath, scenarioId, evaluationId).with(lector))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenarioId").value(scenarioId))
                .andExpect(jsonPath("$.evaluatedAt").exists())
                .andExpect(jsonPath("$.results[0]").value(true))
                .andExpect(jsonPath("$.results[1]").value(false));
        mockMvc.perform(get(evaluationPath, scenarioId, evaluationId).with(auth("LECTOR", UUID.randomUUID())))
                .andExpect(status().isNotFound());

        var liveVitalsAfter = mockMvc.perform(get("/api/vitals")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(liveVitals, liveVitalsAfter);
    }

    @Test
    void requiresCompleteAndInRangeInitialVitalsAndNonblankChecklistItems() throws Exception {
        var lector = auth("LECTOR", UUID.randomUUID());
        for (String invalid : new String[]{
                SCENARIO.replace("\"heartRate\": 105, ", ""),
                SCENARIO.replace("\"spo2\": 94", "\"spo2\": 101"),
                SCENARIO.replace("Monitor gecontroleerd", " ")
        }) {
            mockMvc.perform(post(SCENARIOS).with(lector).contentType(MediaType.APPLICATION_JSON).content(invalid))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void requiresExactlyOneExplicitResultPerFeedbackItem() throws Exception {
        var lector = auth("LECTOR", UUID.randomUUID());
        var scenarioId = createScenario(lector);
        for (String invalid : new String[]{"[true]", "[true,null]", "[true,false,true]"}) {
            mockMvc.perform(post(SCENARIOS + "/{id}/evaluations", scenarioId).with(lector)
                            .contentType(MediaType.APPLICATION_JSON).content("{\"results\":" + invalid + "}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void updatesAndPublishesDraftInPlaceBeforeAllowingEvaluation() throws Exception {
        var lector = auth("LECTOR", UUID.randomUUID());
        var draftBody = SCENARIO.replace("\"name\":", "\"status\": \"DRAFT\", \"name\":");
        var draft = mockMvc.perform(post(SCENARIOS).with(lector)
                        .contentType(MediaType.APPLICATION_JSON).content(draftBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn().getResponse().getContentAsString();
        var id = objectMapper.readTree(draft).path("id").asString();
        var path = SCENARIOS + "/" + id;

        mockMvc.perform(post(path + "/evaluations").with(lector)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"results\":[true,false]}"))
                .andExpect(status().isConflict());
        mockMvc.perform(put(path).with(lector).contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody.replace("Monitorsimulatie", "Gewijzigd concept")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"));
        mockMvc.perform(get(path).with(lector))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Gewijzigd concept"));
        var publishBody = SCENARIO.replace("\"name\":", "\"status\": \"PUBLISHED\", \"name\":")
                .replace("Monitor gecontroleerd", "Monitor beoordeeld");
        mockMvc.perform(put(path).with(lector).contentType(MediaType.APPLICATION_JSON).content(publishBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.feedbackItems[0]").value("Monitor beoordeeld"));
        mockMvc.perform(post(path + "/evaluations").with(lector)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"results\":[true,false]}"))
                .andExpect(status().isCreated());
        mockMvc.perform(put(path).with(lector).contentType(MediaType.APPLICATION_JSON).content(draftBody))
                .andExpect(status().isConflict());
    }

    @Test
    void deletesOnlyTheRequestedScenarioAndItsEvaluations() throws Exception {
        var lector = auth("LECTOR", UUID.randomUUID());
        var otherLector = auth("LECTOR", UUID.randomUUID());
        var scenarioId = createScenario(lector);
        var retainedId = createScenario(lector);
        var evaluationPath = SCENARIOS + "/" + scenarioId + "/evaluations";
        var evaluationBody = "{\"results\":[true,false]}";
        var response = mockMvc.perform(post(evaluationPath).with(otherLector)
                        .contentType(MediaType.APPLICATION_JSON).content(evaluationBody))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        var evaluationId = objectMapper.readTree(response).path("id").asString();
        var retainedPath = SCENARIOS + "/" + retainedId + "/evaluations";
        var retainedResponse = mockMvc.perform(post(retainedPath).with(lector)
                        .contentType(MediaType.APPLICATION_JSON).content(evaluationBody))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        var retainedEvaluationId = objectMapper.readTree(retainedResponse).path("id").asString();

        mockMvc.perform(delete(SCENARIOS + "/{id}", scenarioId).with(auth("CURSIST", UUID.randomUUID())))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete(SCENARIOS + "/{id}", scenarioId).with(lector))
                .andExpect(status().isNoContent());
        mockMvc.perform(get(SCENARIOS).with(lector))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", not(hasItem(scenarioId))))
                .andExpect(jsonPath("$[*].id", hasItem(retainedId)));
        mockMvc.perform(get(evaluationPath + "/{id}", evaluationId).with(otherLector))
                .andExpect(status().isNotFound());
        mockMvc.perform(get(retainedPath + "/{id}", retainedEvaluationId).with(lector))
                .andExpect(status().isOk());
        mockMvc.perform(delete(SCENARIOS + "/{id}", scenarioId).with(lector))
                .andExpect(status().isNotFound());
    }

    @Test
    void restrictsScenarioApiToLectors() throws Exception {
        mockMvc.perform(get(SCENARIOS)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(SCENARIOS).with(auth("CURSIST", UUID.randomUUID()))
                        .contentType(MediaType.APPLICATION_JSON).content(SCENARIO))
                .andExpect(status().isForbidden());
        mockMvc.perform(post(SCENARIOS + "/{id}/evaluations", UUID.randomUUID())
                        .with(auth("CURSIST", UUID.randomUUID()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"results\":[true]}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put(SCENARIOS + "/{id}", UUID.randomUUID())
                        .with(auth("CURSIST", UUID.randomUUID()))
                        .contentType(MediaType.APPLICATION_JSON).content(SCENARIO))
                .andExpect(status().isForbidden());
    }

    private String createScenario(JwtRequestPostProcessor lector) throws Exception {
        var response = mockMvc.perform(post(SCENARIOS).with(lector)
                        .contentType(MediaType.APPLICATION_JSON).content(SCENARIO))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).path("id").asString();
    }

    private static JwtRequestPostProcessor auth(String role, UUID userId) {
        return jwt().jwt(token -> token.subject(userId.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role));
    }
}
