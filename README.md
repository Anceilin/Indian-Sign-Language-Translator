# ISL AI Translator — Indian Sign Language AI Recognition Portal

**ISL AI Translator** is a modern full-stack web application designed for real-time **Indian Sign Language (ISL) gesture recognition and translation** into English and Tamil text output.

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v3, React Router v6, Lucide React Icons
- **Backend**: Node.js, Express.js, REST API, CORS, Dotenv
- **AI Engine (Architecture Ready)**: MediaPipe Hands (21 Landmark Points) + TensorFlow.js ML Classifier
- **Database (Planned Stage 2)**: MongoDB, Mongoose
- **Auth (Planned Stage 2)**: JWT, bcrypt

---

## Directory Structure

```
isl/
├── frontend/             # React + Vite frontend application
│   ├── src/
│   │   ├── components/   # Navbar, Footer
│   │   ├── pages/        # Home, Login, Register, Dashboard, LiveTranslator, History, Learning, Profile
│   │   ├── App.jsx       # Router configuration
│   │   ├── main.jsx
│   │   └── index.css     # Tailwind directives
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env.example
├── backend/              # Node.js + Express API server
│   ├── src/
│   │   ├── routes/       # Health check route (/api/health)
│   │   └── server.js     # Express server setup
│   ├── package.json
│   └── .env.example
├── ai/                   # Landmark tracking & ML architecture outline
│   └── README.md
├── docs/                 # Status tracking
│   └── PROJECT_STATUS.md
└── README.md
```

---

## Quick Start Guide

### Prerequisites
- Node.js (v18.x or higher)
- npm (v9.x or higher)

### 1. Run the Backend API Server

```bash
cd backend
npm install
npm run dev
```

The backend Express server will start on `http://localhost:5000`.
- Health Check Endpoint: `http://localhost:5000/api/health`

### 2. Run the Frontend React Application

In a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server will start on `http://localhost:5173`. Open your browser to explore all pages:
- **Home**: `http://localhost:5173/`
- **Live Translator**: `http://localhost:5173/translator`
- **Practice / Learn**: `http://localhost:5173/learning`
- **Dashboard**: `http://localhost:5173/dashboard`
- **History**: `http://localhost:5173/history`
- **Login / Register / Profile**: `/login`, `/register`, `/profile`

---

## Verification & Testing

To verify production build stability:

```bash
cd frontend
npm run build
```

---

## Roadmap & Status

See [`docs/PROJECT_STATUS.md`](file:///c:/Users/Kannan/Desktop/isl/docs/PROJECT_STATUS.md) for full stage-by-stage details.
