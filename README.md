# 🍲 AnnaSetu – AI-Powered Food Waste Management & Redistribution Platform

> **AnnaSetu** (*Bridge of Food*) is an end-to-end intelligent food management ecosystem designed for university and college hostel campuses. It combines machine learning meal turnout forecasting, dynamic microbiological shelf-life modeling, automated surplus food redistribution to registered NGOs, IoT cold chain monitoring, driver route optimization, and cryptographic ESG audit verification.

---

## 🌟 Key Capabilities

1. **AI Turnout Forecaster (Random Forest Regressor)**:
   - Trained on 730+ hostel mess calendar entries and real historical dining records.
   - Computes expected turnout for **Breakfast**, **Lunch**, and **Dinner**.
   - Calculates recommended cooking quantities with an **8% safety buffer** and 90th-percentile error margin bands to prevent food shortages while avoiding overproduction.

2. **Microbiological Safe-Window Calculator (Arrhenius Model)**:
   - Evaluates remaining shelf life using temperature-dependent biological decay:
     $$\text{Safe Hours} = \text{Base Hours} \times 2^{\frac{25 - T}{10}}$$
   - Flags batches as **Critical (<2h)**, **Moderate (2-5h)**, or **Comfortable (>5h)**.

3. **Separate Dashboards & Role Experiences**:
   - **Hostel Administrator**: Kitchen turnout forecaster, surplus food logger, ambient temperature controls, live active surplus tracker, 14-day accuracy charts, and IoT telemetry.
   - **NGO Coordinator**: Real-time available surplus feed, multi-factor suitability ranking, one-click claim workflow, and secure 6-digit OTP delivery handoff generator.
   - **Delivery Driver / Logistics**: Traveling-Salesperson (TSP) multi-stop route planner with ETA countdowns, route distance savings %, and physical OTP delivery verification.
   - **ESG Auditor**: Cryptographic SHA-256 chained audit logs, Scope 3 greenhouse gas avoidance (CO₂e), and UN SDG 12.3 / BRSR Principle 6 compliance reporting.

4. **Reliable Persistence Architecture**:
   - Built for native **PostgreSQL** storage via SQLAlchemy.
   - **Safe Demonstration Fallback**: If PostgreSQL is not installed or `DATABASE_URL` is omitted, AnnaSetu gracefully falls back to persistent local SQLite storage (`annasetu.db`) with full transactional integrity, zero crashes, and an explicit demo mode status indicator.

---

## 🏗️ Architecture

```
AnnaSetu/
├── Backend/                 # FastAPI REST Service & Machine Learning Backend
│   ├── app/
│   │   ├── config.py        # Pydantic BaseSettings & Environment variables
│   │   ├── database.py      # SQLAlchemy Engine with PostgreSQL + SQLite fallback
│   │   ├── models.py        # Tables: Users, Locations, Attendance, Surplus, Claims, Audit, IoT, Notifications
│   │   ├── schemas.py       # Pydantic Schemas for API requests & responses
│   │   ├── seed.py          # Demonstration dataset (Hostels, NGOs, 14 days attendance, IoT nodes)
│   │   ├── routes/          # API Routers: /health, /forecast, /surplus, /claims, /routes, /iot, /analytics, /notifications
│   │   └── services/        # ML Forecaster, Safe-Window Calculator, Route Optimizer, SHA-256 Audit Chain, IoT Telemetry
│   ├── tests/
│   │   └── test_api.py      # Automated API test suite
│   ├── main.py              # Application entrypoint & CORS middleware
│   └── mess_rfr_model.joblib# Pre-trained Random Forest model
│
├── Frontend/                # Next.js 14 Web Application
│   ├── src/
│   │   ├── app/             # App Router: layout.tsx, page.tsx, globals.css
│   │   ├── components/      # Role-based Dashboards (HostelAdmin, NGO, Driver, Auditor), LeafletMap, Navbar
│   │   ├── lib/api.ts       # Typed API Client connecting to FastAPI backend
│   │   └── types/index.ts   # TypeScript interfaces
│   ├── legacy_prototype/    # Preserved original HTML/JS prototype files
│   ├── tailwind.config.js   # Tailored emerald & saffron color theme
│   └── package.json         # Next.js, React, Tailwind, Chart.js, Leaflet, Lucide
│
└── ML/                      # Model Training & Academic Calendar Lookahead
    ├── mess_model.py        # RandomForestRegressor training script with time-series evaluation
    ├── mess_model.joblib    # High-accuracy look-ahead Random Forest model
    ├── Holidays_final_fixed.csv           # College academic holiday calendar
    └── Mess_attendance_dataset_fixed.csv  # Historical meal attendance dataset
```

---

## 🚀 How to Run Locally

### 1. Prerequisites
- **Python 3.10+** (Python 3.13 supported)
- **Node.js 18+** (Node.js 20 or 24 supported) & **npm**

---

### 2. Run the FastAPI Backend

Open a terminal in the project directory:

```bash
cd Backend

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Or Windows CMD:
# .\venv\Scripts\activate.bat

# (Optional) If you have PostgreSQL running:
# set DATABASE_URL=postgresql://user:password@localhost:5432/annasetu

# Start the FastAPI server
python -m uvicorn main:app --reload --port 8000
```

The backend will start at **`http://127.0.0.1:8000`**.
- Interactive Swagger API Docs: **`http://127.0.0.1:8000/docs`**
- Health Check: **`http://127.0.0.1:8000/api/v1/health`**

---

### 3. Run the Next.js Frontend

Open a second terminal:

```bash
cd Frontend

# Start Next.js development server
npm run dev
```

Open your browser at **`http://localhost:3000`**.

---

### 4. Running Backend Tests

To run the automated test suite verifying all 8 core services:

```bash
cd Backend
python tests/test_api.py
```

---

### 5. Running Frontend Production Build

To verify and compile the optimized production frontend:

```bash
cd Frontend
npm run build
```

---

## 🎬 Hackathon Demonstration Script

1. **Hostel Administrator Dashboard**:
   - Check the **Target Date** picker (defaults to tomorrow) to view AI demand forecasts for Breakfast, Lunch, and Dinner. Notice the predicted diner turnout, 8% safety buffer recommendation, and 90% confidence intervals.
   - In the **Post Surplus Food** form, enter a dish, quantity in kg, and adjust the **Ambient Temperature** slider. Watch the calculated microbiological safe shelf-life adjust in real time.
   - Click **Broadcast Surplus to Nearby NGOs** to create a live listing.
   - Click **Rank Nearby NGOs** to see how recipient shelters are sorted by drive duration and remaining safe window.
   - In the **IoT Telemetry** card, click **Simulate Cold Room Spike** to see an instant sensor alarm and notification trigger.

2. **NGO Coordinator Dashboard**:
   - Switch role to **NGO Coordinator** using the top operating role bar.
   - View newly broadcasted surplus food with urgency badges.
   - Click **Claim for Shelter** and confirm the quantity. An instant 6-digit cryptographic OTP is generated (e.g. `482913`).
   - Observe the interactive Leaflet OpenStreetMap showing hostel mess and recipient shelter coordinates.

3. **Logistics & Driver Console**:
   - Switch role to **Logistics / Driver**.
   - Review the multi-stop TSP route with total km, travel minutes, and distance savings %.
   - Locate the delivery stop and enter the 6-digit OTP code provided by the NGO coordinator.
   - Click **Confirm** to verify physical delivery, automatically archiving the claim and writing to the cryptographic audit chain.

4. **ESG Auditor Console**:
   - Switch role to **ESG Auditor**.
   - Inspect total food diverted from landfills, net CO₂e avoided by category, and economic value rescued.
   - Review the **SHA-256 Audit Trail** table verifying every block hash and tamper-evident link.
   - Click **Export ESG Report** to print or export the compliance summary.
