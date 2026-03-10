# 🔍 SpendLens

> **Finally know where your money actually goes.**

SpendLens is a premium personal finance tracking and subscription management dashboard. Built with a modern **MERN stack**, it combines a beautiful, responsive frontend with a robust, secure backend featuring automated daily alerts, advanced analytics aggregation, and intelligent subscription detection.

[![React](https://img.shields.io/badge/React-18.x-blue.svg?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg?logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248.svg?logo=mongodb)](https://www.mongodb.com/)

---

## ✨ Key Features

- **Global Currency Switcher**: View your finances in **INR (₹)**, **USD ($)**, **EUR (€)**, or **GBP (£)**. Applies globally across the dashboard, bills, and analytics in real-time.
- **Intelligent Alert Engine**: A daily Node.js cron job that automatically detects:
  - Upcoming due dates (sending branded HTML email reminders)
  - Overdue bills (auto-updating status to `overdue`)
  - Overspending (triggers if current month spend is 30% higher than the 3-month average)
  - Duplicate subscriptions (fuzzy matching names within the same category)
- **Advanced Analytics**: MongoDB aggregation pipelines deliver monthly spending trends, category breakdowns, and normalized subscriptions (annual/quarterly normalized to monthly equivalents).
- **Secure Authentication**: Dual JWT architecture. 15-minute access tokens kept solely in memory, combined with 7-day SHA-256 hashed refresh tokens stored in `httpOnly` cookies.
- **Premium UI/UX**: Built entirely without UI libraries using Vanilla CSS. Features a custom theme system (Dark/Light mode via `data-theme`), animated skeleton loaders, glassmorphism, and Recharts integration.

---

## 🛠 Tech Stack

### Frontend (`/client`)
- **Framework**: React 18 + Vite
- **Routing**: React Router DOM v6
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid, Custom Data Themes)
- **Data Visualization**: Recharts
- **Icons**: Lucide React
- **API Client**: Axios (with centralized request/response interceptors for silent token refresh)

### Backend (`/server`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas + Mongoose ODM
- **Authentication**: JWT, bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, express-rate-limit, CORS
- **Jobs Engine**: node-cron
- **Email**: Nodemailer (SMTP transport)

---

## 🏗 Architecture

### Backend Security Integration
- **Token Rotation**: On every `/api/auth/refresh`, the old refresh token is deleted from the DB and a new pair is issued.
- **Auto-Cleanup**: The `RefreshToken` Mongoose schema uses a TTL (Time-To-Live) index to automatically have MongoDB background threads clean up expired sessions.
- **Rate Limiting**: The `/api/auth/*` endpoints are strictly limited to 10 requests per 15 minutes per IP to prevent brute-force attacks.
- **Sanitized Responses**: Passwords are never sent back in API responses (handled via Mongoose `select: false` and a `toJSON` transform).

### Frontend State Management
- **Context API**: Used for global states like `ThemeContext`, `AuthContext`, `ToastContext`, and `CurrencyContext`.
- **Silent Refresh**: On app load, `AuthContext` makes a silent `GET /api/auth/me` request using the `httpOnly` refresh cookie. If valid, the user is logged in perfectly without storing tokens in `localStorage` (preventing XSS).

---

## 🛣 API Endpoints

### Auth `(/api/auth)`
- `POST /register` - Register new user
- `POST /login` - Local authentication
- `POST /refresh` - Refresh access token via cookie
- `POST /logout` - Clear cookies and DB session
- `GET /me` - Get current user profile (Protected)

### Bills `(/api/bills)` *All Protected*
- `GET /` - List bills (supports filtering, sorting, pagination)
- `POST /` - Create a new bill (auto-triggers near-term alerts)
- `GET /:id` - Get specific bill
- `PUT /:id` - Update bill (auto-refreshes alerts on due date change)
- `DELETE /:id` - Delete bill and its associated alerts

### Analytics `(/api/analytics)` *All Protected*
- `GET /summary` - Combined dashboard macro stats
- `GET /monthly` - 6-month spending trend via aggregations
- `GET /category` - Percentage breakdown by category
- `GET /subscriptions` - Normalized recurring costs

### Alerts `(/api/alerts)` *All Protected*
- `GET /` - Fetch user's alert feed (unread first)
- `PATCH /read-all` - Mark all alerts as read
- `PATCH /:id/read` - Mark single alert as read
- `DELETE /:id` - Soft delete (dismiss) an alert

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas Account (or local MongoDB instance)
- Gmail / SendGrid account (for Nodemailer)

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/yourusername/spendlens.git
cd spendlens
\`\`\`

### 2. Install Dependencies
You need to install dependencies for both the frontend root and the backend server.

\`\`\`bash
# Install frontend packages
npm install

# Install backend packages
cd server
npm install
cd ..
\`\`\`

### 3. Environment Variables
Navigate to the `server/` directory, copy the example `.env` file, and fill in your details.

\`\`\`bash
cd server
cp .env.example .env
\`\`\`

Ensure you define the following inside `server/.env`:
\`\`\`env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.monyx.mongodb.net/spendlens
JWT_ACCESS_SECRET=your_super_secret_access_string (generate via openssl rand -hex 64)
JWT_REFRESH_SECRET=your_super_secret_refresh_string
CLIENT_ORIGIN=http://localhost:5173
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-google-app-password
ALERT_CHECK_CRON=0 9 * * *
\`\`\`

### 4. Running the App (Development)

Open two terminal windows.

**Terminal 1 (Backend Server):**
\`\`\`bash
cd server
npm run dev
# The backend should start on port 5000 and connect to MongoDB.
\`\`\`

**Terminal 2 (Frontend Client):**
\`\`\`bash
# From the root directory
npm run dev
# The frontend should start on port 5173.
\`\`\`

Navigate to `http://localhost:5173` in your browser.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
