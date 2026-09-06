# Antigravity — Smart Livestock Health & Early Warning Platform

## Product Vision
Antigravity is a Smart Livestock Health & Early Warning Platform built for the Smart India Hackathon 2026 (Problem Statement 128). It connects farmers with veterinary services and authorities, providing an early warning system for livestock health issues via AI screening, health history tracking, and geospatial risk mapping.

The platform consists of two main applications communicating with a unified backend:
1. **Farmer App:** A mobile-first, low-literacy friendly application allowing farmers to profile their livestock, log symptoms (via text/voice), upload images, and get instant Explainable AI screening results.
2. **Veterinary / Authority Portal:** A desktop-first web application for veterinarians and authorities to manage case queues, review predictions, schedule vaccinations, track lab referrals, and monitor geospatial risk maps for disease clusters.

## Safety, Privacy & Responsible AI
- All model/prediction outputs are logged with context (input reference, `model_version`, timestamp) for auditability.
- No secrets, API keys, or JWT signing keys are committed to source control.
- Object storage is used for images and documents, with Postgres holding only references.
- **AI/ML Boundary:** The core system calls an external ML service for screening. It does not train, fine-tune, or manage the AI model itself.

## Architecture

The system is built as a modular REST API backend with two distinct frontend applications.

### Repository Structure
```
backend/
├── auth/          → JWT issuance & validation, RBAC
├── animals/        → Animal registry and visibility scoping
├── health/         → Symptoms, images, timeline
├── prediction/     → Orchestrates ML calls and stores results
├── vaccination/    → Scheduling and reminder logic
├── alerts/         → Event notification hub
├── veterinary/     → Case lifecycle and status transitions
├── laboratory/     → Sample collection and lab result tracking
└── geospatial/     → Aggregation for maps and dashboards

farmer-app/         → React Native (Expo) mobile-first application
vet-portal/         → React/Next.js desktop-first web application
```

## Roadmap / Phased Build Order
1. **Foundations:** auth service + JWT, base DB schema, empty shells for both frontends, CI pipeline.
2. **Animal management:** `animals` module + Farmer "My Animals" + Vet "Animals & Farms".
3. **Health capture:** `health` module (symptoms, images) + Farmer "Screen Now" wizard.
4. **Screening loop (core MVP):** `prediction` module with a mocked `/ml/screen` client wired end-to-end to the Farmer Result Screen and auto-created Vet case.
5. **Vaccination + Alerts:** vaccination CRUD + due-date sweep + alert pipeline.
6. **Geospatial:** nearby-vet search, Risk Map, Farm Dashboard aggregates.
7. **Laboratory workflow, Analytics, Admin/User Management.**
8. **Offline-first hardening, multilingual/voice, accessibility pass, security review, load testing.**
9. **Final ML Integration:** Swap mock ML client for real ML service.

## Definition of Done (Core MVP Loop)
- Farmer registers/logs in -> creates an animal profile.
- Farmer records symptoms and captures an image.
- App submits screening request to backend.
- Backend validates, calls ML service, stores prediction, and builds explanation.
- Farmer sees risk level, explanation, and recommended action.
- If high risk, veterinary case is auto-created.
- Veterinarian sees case on dashboard, reviews history/prediction, and updates status.
- Farmer's health record and alerts reflect the outcome.
