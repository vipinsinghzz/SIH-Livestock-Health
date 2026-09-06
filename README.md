# SIH-Livestock-Health

AI-powered livestock health and early-warning platform for Smart India Hackathon 2026, Problem Statement 128.

## Overview

The platform connects livestock owners, veterinarians, and authorities through early health-risk screening, health records, veterinary coordination, vaccination tracking, and geospatial monitoring.

It is designed as a screening and decision-support tool, not a replacement for a qualified veterinarian.

## Applications

- `backend/`: Modular REST API for authentication, animals, health records, predictions, vaccinations, alerts, veterinary workflows, laboratory referrals, and geospatial data.
- `farmer-app/`: React Native and Expo mobile application for animal profiles, symptom capture, images, screening results, alerts, and offline-first workflows.
- `vet-portal/`: Next.js web portal for case queues, animal and vaccination management, prediction review, and risk maps.

## Core Workflow

1. A farmer creates an animal profile and records symptoms or images.
2. The backend validates the screening request and calls the ML service.
3. The result includes a risk level, explanation, and recommended action.
4. High-risk cases can be routed to the veterinary portal.
5. Health records, alerts, vaccination reminders, and follow-up actions are updated.

## Safety and Privacy

- Do not commit secrets, API keys, JWT signing keys, or local environment files.
- Prediction outputs are logged with their input reference, model version, and timestamp for auditability.
- Images and documents use object storage; PostgreSQL stores references.
- The backend integrates with an external ML service and does not train or manage the model.

## Repository Structure

```text
backend/       REST API and domain modules
farmer-app/    React Native / Expo farmer application
vet-portal/    Next.js veterinary and authority portal
```

## Development Roadmap

1. Authentication, database foundations, and frontend shells.
2. Animal management and health capture.
3. End-to-end screening with explainable results.
4. Vaccination, alerts, veterinary workflows, and geospatial monitoring.
5. Laboratory workflows, analytics, offline support, accessibility, and final ML integration.
