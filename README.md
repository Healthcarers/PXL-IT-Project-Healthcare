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