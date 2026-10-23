# CineComply AI - OTT Content Guidelines & Regulatory Compliance Platform

An enterprise-grade, full-stack web application built in **Next.js 14 (App Router)** using **pure JavaScript (`.js` and `.jsx`)** with **CSS Modules (`.module.css`)**, **Google Gemini 3.5 Multimodal AI**, **Cloudinary Media Storage**, **MongoDB Atlas (Mongoose)**, and **NextAuth.js**.

The platform performs real-time, multimodal AI regulatory compliance analysis against **CBFC (Central Board of Film Certification)** guidelines and the **Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021**, generating official statutory review certificates.

---

## 🚀 Key Features & Highlights

- **Pure JavaScript Architecture:** Built strictly in JavaScript (`.js` and `.jsx`) with path aliases configured via `jsconfig.json` (Zero TypeScript).
- **CSS Modules & Theming:** Hand-crafted CSS Modules (`.module.css`) and global CSS variables without Tailwind CSS. Seamless toggle between **"Dolby Cinema Obsidian" (Dark Mode - Default)** and **"Studio Daylight" (Light Mode)** via `next-themes`.
- **Multimodal AI Regulatory Engine (`@google/genai`):** Evaluates visual posters, movies, short films, songs, and 9:16 vertical reels using Google Gemini 3.5 Multimodal AI with automated model fallbacks.
- **Mandatory Content Descriptors Matrix:** Scores and details content across all 7 statutory categories:
  1. **Themes** (Social, moral, psychological impact)
  2. **Violence** (Combat, gore, weapons, brutality)
  3. **Nudity** (Anatomical exposure, modesty)
  4. **Sex** (Intimacy, suggestive themes)
  5. **Language** (Profanity, vulgarity, hate speech)
  6. **Drug & Substance Abuse** (Smoking, alcohol, narcotics, statutory warnings)
  7. **Horror** (Terror, jump scares, atmospheric tension)
- **Adaptive Media Inspector & Interactive Timeline:**
  - Widescreen 16:9 cinema viewport and 9:16 vertical mobile dock with auto aspect-ratio detection.
  - Interactive timeline violation bar with pinpoint markers. Clicking any marker or violation card seeks the media player to that exact timestamp (`MM:SS`).
- **Interactive "What-If" Remediation Simulator:** Dynamic simulator demonstrating projected release risk reductions as proposed editorial cuts/edits are applied.
- **Official PDF Compliance Certificate Export:** Downloadable high-resolution branded regulatory certificate generated client-side using `jspdf` and `jspdf-autotable`.
- **Secure Authentication:** NextAuth.js Credentials provider with bcrypt-hashed passwords and protected routes middleware.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** JavaScript (`.js`, `.jsx`)
- **Styling:** CSS Modules (`.module.css`), CSS Variables, `next-themes`
- **Database:** MongoDB Atlas via Mongoose
- **Media Storage:** Cloudinary CDN
- **AI / LLM:** Google Gemini API (`@google/genai`)
- **Authentication:** NextAuth.js & `bcryptjs`
- **PDF Generation:** `jspdf` & `jspdf-autotable`
- **Icons:** `lucide-react`

---

## 📋 4-Step Application Workflow

1. **Step 1: Authentication Gateway (`/login` & `/register`)**
   - Secure login and registration portal with role-based access control. Includes a quick demo credentials autofill button.
2. **Step 2: Cinema Studio Dashboard (`/` or `/dashboard`)**
   - Precision telemetry cards: Total Submissions, Clearance Rate %, High-Risk Advisory Flags, and Average Regulatory Friction Score.
   - Comprehensive Regulatory Audit Queue with age ratings, risk meters, and inspection links.
3. **Step 3: Media Upload Studio (`/submit`)**
   - Upload media from the explicit option array: `[Poster (img), Movie, Short Film, Song, Short Video (Reels)]`.
   - Supports 16:9 widescreen and 9:16 vertical reels with automatic aspect-ratio detection.
   - Real-time multi-stage AI analysis progress feedback.
4. **Step 4: Statutory Compliance Review (`/report/[id]`)**
   - Official Age Classification Badge (`U`, `U/A 7+`, `U/A 13+`, `U/A 16+`, `A`, or `REJECTED`).
   - 0%–100% Release Risk radial gauge.
   - Adaptive video/image player with clickable timeline violation markers.
   - 7-category mandatory content descriptors breakdown.
   - Actionable timestamped violation log and "What-If" remediation simulator.
   - One-click branded PDF export.

---

## ⚙️ Environment Variables Setup

Create a `.env.local` file in the root directory:

```env
# Google Gemini API Key
GEMINI_API_KEY="your-gemini-api-key"

# NextAuth Configuration
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# MongoDB Database Connection
DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.mongodb.net/"

# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
```

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm run start
```

---

## 🔐 Default Demo Credentials

- **Email:** `demo.reviewer@cinecomply.io`
- **Password:** `Compliance2026!`
*(Or click the "Fill Demo Reviewer Credentials" button on the `/login` page)*

---

## 📄 License
This project is licensed under the ISC License.
