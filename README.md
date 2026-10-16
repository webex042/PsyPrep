# PsyPrep — Online Mock Test & Quiz Platform (MERN)

A production-quality, serverless-capable online mock test and quiz platform built for schools and colleges with the **MERN** stack (MongoDB, Express, React, Node.js), Tailwind CSS, and Recharts.

---

## 🎯 Key Features & Centerpieces

### 1. Timed Test-Taking Engine
- **Server-Authoritative Timer:** Test durations and end times are anchored in the database (`startedAt + durationMinutes`). Clients receive remaining milliseconds on hydration; local clocks cannot cheat the system.
- **Auto-Submit Guarantee (Two-Layer Defense):**
  1. *Lazy Finalization on Access:* Any read (`GET /api/attempts/:id`) or write after the deadline immediately locks and auto-grades the attempt.
  2. *Vercel Cron Trigger:* Regular invocation of `POST /api/attempts/finalize-expired` (secured via `CRON_SECRET`) sweeps and finalizes abandoned or expired in-progress tests in the background.
- **Interactive Question Palette:** Visual navigation grid tracking:
  - Visited vs. Unvisited
  - Answered
  - Marked for Review
  - Answered & Marked for Review
- **Autosave & Resume After Refresh:** Answers and review flags persist seamlessly with debounced background saves (`PATCH /api/attempts/:id/answers`). Refreshing or losing network allows instant resume without data loss.
- **Single Active Attempt Lock:** Prevents opening concurrent sessions with a `409 Conflict`.
- **Unlimited Retakes:** Students can retake mock tests any number of times to track their learning progression.

### 2. Results, Analytics & Solutions
- **Immediate Scoring:** Server-graded instantly upon submission.
- **Strict No-Negative Marking:** Correct answers receive full question marks; incorrect and unattempted questions both score 0.
- **Solution & Question Review:** Clear question-by-question breakdown showing student choice, correct answer, and rationale (with clean empty state when omitted). Pre-submission APIs strictly redact answers to prevent inspection leaks.
- **Student Performance Analytics:**
  - *Best vs. Latest:* Side-by-side comparison cards on student dashboard.
  - *Improvement Trend:* Recharts line charts tracking score trajectories across retakes.
  - *Topic Mastery Breakdown:* Recharts bar charts showing accuracy across subjects and topics.
- **Teacher Dashboard & Item Analysis:**
  - Aggregate score distributions (score histograms).
  - Most-missed questions analysis to identify teaching gaps.
  - Single-question authoring & bulk JSON/CSV question import.

### 3. Editorial Academic × Swiss Grid × Professional CBT Design System
- **Identity & Aesthetics:** Tailored for the **Psychology of Learning — NPTEL 2026 Examination Environment**. Combines contemporary academic editorial branding, precision Swiss Grid layouts, and distraction-free Computer-Based Testing (CBT).
- **Strict Color Tokens (No Blue as Primary):**
  - Warm Paper: `#F5F0E6`
  - Pure White Surfaces: `#FFFFFF`
  - Primary Ink: `#191919`
  - Secondary Text: `#66645F`
  - Soft Border: `#D9D2C5`
  - Muted Orange (Primary Action & Highlights): `#D96836`
  - Muted Sage (Success & Answered States): `#65715B`
- **Typographic Hierarchy:**
  - Headings: **Space Grotesk** / **Manrope**
  - Interface & Body Text: **Inter**
  - Timers, Question Numbers, Metadata: **IBM Plex Mono**
- **CBT Examination Features:**
  - Distraction-free question area with comfortable reading width and generous line-height.
  - Full-width selectable option rows with subtle hover and orange selection state.
  - 5-state question palette: Answered (Sage `#65715B`), Marked (Orange `#D96836`), Answered & Marked, Visited (`#D9D2C5`), Unvisited (White).
  - Server-authoritative countdown clock and background autosave synchronization.

---

## 📚 Question Bank

This platform is configured strictly with the **130 curated questions** (13 topics × 10 single-choice MCQs) covering:
1. **Introduction to Psychology**
2. **Foundations of Learning & Behaviorism**
3. **Memory & Cognitive Systems**
4. **Thinking, Prototypes & Bloom's Taxonomy**
5. **Motivation Theories (Hull, Vroom, Maslow, Deci & Ryan)**
6. **Emotional Intelligence (Goleman & Bar-On)**
7. **Instructional Models & Gagne's Conditions of Learning**
8. **Pedagogical Theory & Experiential Learning**
9. **E-Learning Foundations & Visual Processing**
10. **Remote Learning, COVID-19 & Assessment Principles**
11. **Social Cognition & Bandura's Theory**
12. **Sustainable Development & Education for Sustainable Development (ESD)**
13. **Learning Definitions & Orientations (Humanistic, Behavioral, Experiential)**

All questions are maintained in [`seed/questions.json`](file:///seed/questions.json).

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster connection string or local MongoDB instance (`mongodb://127.0.0.1:27017/psyprep`)

### 1. Installation
Clone the repository and install dependencies across all workspaces:
```bash
npm install
```

### 2. Environment Variables
Create `.env` in the project root (or copy from `.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/psyprep?retryWrites=true&w=majority
JWT_SECRET=super-secret-jwt-key-psyprep-2026
JWT_REFRESH_SECRET=super-secret-refresh-key-psyprep-2026
CRON_SECRET=psyprep-cron-secret-xyz
CLIENT_URL=http://localhost:5173
```

### 3. Seed Database with Curated Questions
Run the automated seeder to create test accounts, the master mock test, and import all 130 questions:
```bash
npm run seed
```

**Default Demo Credentials:**
- **Teacher Account:**
  - Email: `teacher@psyprep.edu`
  - Password: `Password123!`
- **Student Account:**
  - Email: `student@psyprep.edu`
  - Password: `Password123!`

### 4. Run Development Servers
Launch both backend (Port 5000) and frontend (Port 5173) concurrently:
```bash
npm run dev
```

Open your browser at `http://localhost:5173`. Quick 1-click login buttons are provided on the login page for rapid evaluation.

---

## 🧪 Testing & Validation

The platform includes comprehensive unit and integration suites covering authentication, quiz lifecycle, the test engine, serverless auto-submit, Recharts analytics, and mutation testing:

```bash
# Run all workspace tests (backend + frontend)
npm test

# Run backend tests only
npm run test:server

# Run frontend tests only
npm run test:client

# Production frontend bundle check
npm run build
```

---

## ☁️ Vercel Deployment Guide

This project is configured out-of-the-box for unified fullstack deployment on [Vercel](https://vercel.com):

### 1. Import Repository to Vercel
1. Push your code to GitHub (`origin/main`).
2. In your Vercel Dashboard, click **Add New Project** → **Import** your repository (`PsyPrep`).
3. Keep the **Root Directory** as `./`.
4. Framework Preset can be kept as **Other** (or Vite). Build Command (`npm run build`) and Output Directory (`client/dist`) are auto-configured by [`vercel.json`](file:///vercel.json).

### 2. Configure Environment Variables in Vercel
In **Project Settings → Environment Variables**, add:

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://<user>:<pwd>@cluster.mongodb.net/psyprep?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secret key for signing access tokens | `your-secure-jwt-secret-min-32-chars` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `your-secure-refresh-secret-min-32-chars` |
| `CRON_SECRET` | Secret key for authenticating Vercel Crons | `your-cron-secret-string` |
| `CLIENT_ORIGIN` *(Optional)* | Allowed origin for CORS (defaults to request origin) | `https://your-project.vercel.app` |

### 3. Initialize Production Database (140 Questions & Demo Accounts)
Once deployed on Vercel, populate your empty MongoDB Atlas cluster using either:
- **Option A (Browser Console):** Log in as Teacher (`teacher@psyprep.edu` / `Password123!`), open the **Faculty Management Hub**, and click **"Seed / Re-sync Questions"**.
- **Option B (HTTP Request / cURL):**
  ```bash
  curl -X POST https://your-deployment.vercel.app/api/quizzes/seed \
    -H "x-cron-secret: your-cron-secret-string"
  ```
  *(Note: If the database is completely empty, the `/api/quizzes/seed` endpoint automatically allows initial seeding without authentication).*

### 4. Vercel Architecture & Crons
- **Frontend SPA (`client`):** React SPA built with Vite into static assets in `client/dist` served on `/(.*)`.
- **Backend API (`api/index.js`):** Production Express application running seamlessly as a Vercel Serverless Function, serving API endpoints on `/api` and `/api/(.*)`.
- **Automated Expiration Cron:** Vercel Cron invokes `/api/attempts/finalize-expired` (supports both `GET` and `POST`) daily to sweep and grade any expired attempts in the background, in full compliance with Vercel Hobby and Pro tier cron constraints. (Additionally, client access triggers real-time lazy finalization).

---

## 📄 License
MIT
