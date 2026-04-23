# EmpathAI — Multimodal Empathetic AI Companion

## 1. Project Description
EmpathAI is a professional AI SaaS platform that detects and analyzes human emotions using three input modalities: face (webcam), voice (microphone), and text (chat). It provides real-time emotion analysis, explainable AI results, downloadable reports, history tracking, and guardian alert notifications. Target users are individuals, therapists, researchers, and caregivers who need emotion-aware insights.

## 2. Page Structure
- `/` — Landing Page (Hero, Features, Dashboard Preview, CTA, Footer)
- `/login` — Login Page
- `/register` — Register Page
- `/dashboard` — Dashboard (Real-Time Monitoring)
- `/analyze` — Analyze Emotion (Core Feature)
- `/results` — Results Page (AI Explainable Report)
- `/history` — History Page
- `/chat` — Chat Interface
- `/analytics` — Analytics Page
- `/alerts` — Alerts Page
- `/settings` — Settings Page

## 3. Core Features
- [x] Landing page with hero, features, CTA
- [x] Authentication (Login / Register with guardian email)
- [x] Dashboard with live webcam, voice, text, emotion display
- [ ] Analyze page with modality toggles
- [ ] Results page with explainable AI output
- [ ] History page with past analyses
- [ ] Chat interface with emotion-aware AI
- [ ] Analytics page with charts
- [ ] Alerts page with guardian notifications
- [ ] Settings page with profile and preferences

## 4. Data Model Design
(No Supabase connected — using mock data)

### Mock: analyses
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique ID |
| date | string | ISO timestamp |
| inputs | string[] | face/voice/text |
| emotion | string | Final emotion |
| confidence | number | 0-100 |
| intensity | string | low/medium/high |

### Mock: alerts
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique ID |
| type | string | distress/warning |
| emotion | string | Triggering emotion |
| timestamp | string | ISO timestamp |
| status | string | sent/pending/failed |

## 5. Backend / Third-party Integration Plan
- Supabase: Not connected (Phase 2 — auth, data storage)
- Shopify: Not needed
- Stripe: Not needed
- Emotion AI API: Placeholder for backend integration

## 6. Development Phase Plan

### Phase 1: Core UI — Landing, Auth, Dashboard ✅
- Goal: Build the three main pages with full UI
- Deliverable: Landing page, Login/Register, Dashboard with sidebar

### Phase 2: Analyze & Results Pages
- Goal: Build the core emotion analysis flow
- Deliverable: Analyze page with toggles, Results page with explainable output

### Phase 3: History, Chat, Analytics
- Goal: Build supporting feature pages
- Deliverable: History table, Chat interface, Analytics charts

### Phase 4: Alerts & Settings
- Goal: Complete the application
- Deliverable: Alerts page, Settings page

### Phase 5: Backend Integration
- Goal: Connect Supabase for auth and data
- Deliverable: Real authentication, persistent data storage
