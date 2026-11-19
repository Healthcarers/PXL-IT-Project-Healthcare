# IT-Project PXL-Healthcare

## Api

### Api starten 
```bash
cd Api
docker compose up
mvn spring-boot:run
```

### Testen runnen

```bash
cd Api
mvn clean test
```
- coverage in Api/target/site/index.html

### Rooms hervatten

In de navbar van een cursist staat **Room joinen** centraal en de rol **Cursist**
rechts. De link opent het scherm om een roomcode in te geven.

Via **Room aanmaken** keert een lector terug naar de meest recente eigen room
die nog open is of al gestart is. Alleen als er geen actieve room is, verschijnt
het aanmaakformulier. De frontend controleert dit met `GET /api/rooms/mine/active`.

Bij een open room krijgt het hostdashboard na elke geslaagde deelname een
WebSocket-signaal en haalt het meteen de deelnemerslijst opnieuw op. Het
signaal bevat geen deelnemergegevens. Bij een onderbroken verbinding controleert
het dashboard de lijst elke twee seconden. De groene status telt alleen cursisten,
niet de lector.

De lector kan zowel een open als een gestarte room sluiten. Vijf seconden na
het sluiten keert de lector terug naar **Room aanmaken**. Bij cursisten in de
wachtkamer of op de monitor verschijnt een sluitingsmelding. De monitor stopt
met het tonen van grafieken. Na vijf seconden gaat de cursist automatisch naar
het scherm om een nieuwe roomcode in te geven. Via **Naar room joinen** kan de
cursist meteen verder.

### Scenario-API

De scenario-API is alleen toegankelijk voor ingelogde lectoren. Scenario's worden
opgeslagen in de database en zijn beschikbaar voor alle lectoren. De host kan in
het hostdashboard een gepubliceerd scenario aan een open room koppelen en de
basiswaarden bekijken. Die keuze is na de start alleen-lezen en wijzigt de
livewaarden of grafieken van de cursist niet.

De host kan de keuze ophalen via `GET /api/rooms/{code}/scenario` en opslaan via
`PUT /api/rooms/{code}/scenario` met `{"scenarioId":"<uuid>"}`. Gebruik
`{"scenarioId":null}` om de keuze te wissen zolang de room open is. Het
verwijderen van een scenario wist de verwijzing, maar laat de room bestaan.
Lokaal voegt Hibernate bij het starten de optionele kolom `rooms.scenario_id`
en de bijbehorende foreign key toe.

| Methode | Endpoint | Doel |
| --- | --- | --- |
| `POST` | `/api/scenarios` | Scenario aanmaken |
| `GET` | `/api/scenarios` | Scenario's ophalen |
| `GET` | `/api/scenarios/{scenarioId}` | Scenario en checklist ophalen |
| `PUT` | `/api/scenarios/{scenarioId}` | Concept wijzigen of publiceren |
| `DELETE` | `/api/scenarios/{scenarioId}` | Scenario en alle bijbehorende beoordelingen definitief verwijderen |
| `POST` | `/api/scenarios/{scenarioId}/evaluations` | Handmatige beoordeling opslaan |
| `GET` | `/api/scenarios/{scenarioId}/evaluations/{evaluationId}` | Eigen beoordeling ophalen |

Voorbeeld voor `POST /api/scenarios`:

```json
{
  "name": "Monitorsimulatie",
  "description": "Oefenen met de trainingsmonitor.",
  "initialVitals": {
    "heartRate": 105,
    "spo2": 94,
    "respRate": 20,
    "etco2": 36,
    "ampScale": 1.2,
    "sysBloodPressure": 118,
    "diasBloodPressure": 76
  },
  "feedbackItems": ["Monitor gecontroleerd", "Observaties gerapporteerd"],
  "status": "DRAFT"
}
```

Alle zeven startwaarden zijn verplicht en moeten binnen de grenzen van de
bestaande vitals-API vallen. Een scenario moet minstens één feedbackitem hebben,
ook als het als concept wordt opgeslagen.

Lectoren openen via **Scenario's** in de bovenste navigatie eerst het overzicht.
**+ Scenario toevoegen** opent het formulier. In het overzicht kunnen ze een
concept bewerken of een gepubliceerd scenario bekijken. Stuur bij het
aanmaken of bijwerken `DRAFT` om als concept op te slaan, of `PUBLISHED` om
te publiceren. Zonder status wordt het scenario meteen gepubliceerd, zoals
bij de oorspronkelijke API. Alleen gepubliceerde scenario's kunnen worden
beoordeeld; hun checklist kan daarna niet meer worden gewijzigd.

Via het scenario-overzicht kan een lector zowel concepten als gepubliceerde
scenario’s verwijderen. Na bevestiging worden ook alle bijbehorende beoordelingen
definitief verwijderd.

Voor een beoordeling stuurt de lector bijvoorbeeld `{"results": [true, false]}`.
Geef precies één resultaat per feedbackitem, in dezelfde volgorde: `true` betekent
behaald, `false` betekent niet behaald. Elke beoordeling krijgt een eigen ID en
wordt apart opgeslagen.

## Frontend

### Frontend opstarten
```bash
cd Frontend
npm run dev
```

### Testen runnen
```bash
npm run test -- run --coverage
```