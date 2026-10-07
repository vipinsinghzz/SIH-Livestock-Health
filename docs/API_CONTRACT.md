# API Contract: Antigravity Platform

This document defines the REST API contract between the Antigravity frontends (Farmer App, Vet Portal) and the unified Backend.

## §2 Authentication & Authorization
All endpoints (except `/auth/register` and `/auth/login`) require a Bearer JWT in the `Authorization` header.
Role-based access control (RBAC) relies entirely on the `role` claim in the JWT (`FARMER`, `VETERINARIAN`, `ADMIN`).

## §15 Error Handling
Standard error format for all failure paths:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable plain-language message.",
    "request_id": "req_12345"
  }
}
```

## Endpoints

### Auth Module
- `POST /auth/register` (name, phone, password, role)
- `POST /auth/login` (phone, password) -> `{ token, user }`

### Animals Module
- `GET /animals` (scoped by role)
- `POST /animals` (name, tag_id, species, breed, age, sex, weight)
- `GET /animals/{id}`
- `PUT /animals/{id}`

### Health Module
- `POST /animals/{id}/symptoms` (symptoms array, duration, temperature, notes)
- `POST /animals/{id}/images` (multipart upload or base64) -> `{ image_id, url }`
- `GET /animals/{id}/health-history`

### Prediction Module
- `POST /animals/{id}/screen` (triggers the ML screening workflow)
- `GET /animals/{id}/predictions`

### Vaccination Module
- `GET /animals/{id}/vaccinations`
- `POST /animals/{id}/vaccinations`

### Alerts Module
- `GET /alerts` (returns user's alerts, e.g., VACCINATION_DUE, CASE_UPDATED)

### Veterinary Module
- `GET /veterinary-cases`
- `POST /veterinary-cases`
- `PATCH /veterinary-cases/{id}` (status, notes, next_action)

### Geospatial Module
- `GET /farms/{farm_id}/dashboard`
- `GET /veterinary-services/nearby`
- `GET /risk-map`

## §14 External ML Service integration
The prediction module makes a request to the external ML service.
- **Request:** `POST /ml/screen` (animal details, symptoms array, image_url)
- **Response:**
```json
{
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "possible_conditions": [{ "name": "Condition", "confidence": 0.85 }],
  "reason_codes": ["RC1", "RC2"],
  "model_version": "v1.0.0",
  "requires_veterinary_review": true
}
```

## §16 Critical Rules
1. Frontends NEVER talk to the database directly.
2. Frontends NEVER call the ML service directly.
3. Only the `prediction` service calls `/ml/screen`.
4. Role validation must occur on the server.
5. `/screen` requires at least one symptom or image.

## §19 Contract Change Rule
Any changes to this contract require:
1. Opening an issue.
2. Updating this document.
3. Notifying the team.
4. Implementing the change.
5. End-to-end testing.
