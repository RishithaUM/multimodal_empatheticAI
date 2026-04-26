# EmpathAI — Guardian Alerts System

## Overview

The Guardian Alerts system automatically notifies a designated guardian (parent, caregiver, or trusted contact) via email when a concerning emotional pattern is detected in real time.

---

## How It Works

### Trigger Rule
An alert is fired when the **same emotion is detected 3 consecutive times in a row** during a live session.

- This applies to **all tracked emotions**: Happy, Sad, Anxious, Angry, Calm, Excited, Fearful, Disgusted, Surprised, Neutral.
- A **10-minute cooldown** prevents repeated alerts for the same pattern.

### Detection Pipeline
```
Live Input (Face / Voice / Text)
        ↓
Emotion Fusion (multimodal result)
        ↓
Guardian Alert Service — checks consecutive count
        ↓
Count >= 3 → fire alert
        ↓
Email sent to guardian via SendGrid
        ↓
Alert saved to MongoDB
```

---

## Email Notification

- Sent via **SendGrid**
- Branded HTML email with EmpathAI styling
- Timestamp shown in **IST (Indian Standard Time)**
- Includes: detected emotion, confidence score, intensity level, and session context

---

## Alert Severity Levels

| Severity | Condition | Color |
|----------|-----------|-------|
| `warning` | Emotion detected 3× in a row (moderate emotions) | 🟡 Amber |
| `critical` | Emotion detected 3× in a row (high-intensity distress) | 🔴 Red |

---

## Alert Lifecycle

| Status | Meaning |
|--------|---------|
| `active` | Just triggered, guardian email sent |
| `sent` | Email delivery confirmed |
| `dismissed` | Dismissed by the user from the UI |
| `failed` | Email delivery failed |

---

## Guardian Email Configuration

Go to **Settings → Guardian Emails** to:
- Add one or more guardian email addresses
- Remove existing guardians
- Changes are saved instantly to the backend (MongoDB)

---

## Alerts Page

The **Alerts** page (`/alerts`) shows:
- Full history of past alerts (fetched from MongoDB)
- Emotion, confidence, intensity, timestamp (IST), and delivery status for each alert
- Unread count badge shown in the sidebar in real time

---

## Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/alerts/send-email` | Trigger a guardian alert email |
| `GET` | `/api/alerts/history` | Fetch alert history for the authenticated user |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Email delivery | SendGrid API |
| Alert storage | MongoDB |
| Frontend logic | `guardianAlertService.ts`, `useGuardianAlert.ts` |
| Backend logic | `backend/app/routes/alerts.py`, `backend/app/services/email_service.py` |
