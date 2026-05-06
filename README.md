# 🎓 Farewell Seat Reservation System

A full-stack web application that allows students to reserve seats for their farewell event through secure OTP-based authentication, with a real-time interactive seating floor plan and a teacher/admin control panel.

---

## 📋 Table of Contents

- [Project Description](#-project-description)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [OTP Authentication Flow](#-otp-authentication-flow)
- [Seat Booking Flow](#-seat-booking-flow)
- [Admin Features](#-admin-features)
- [Project Structure](#-project-structure)
- [How to Run](#-how-to-run)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Conclusion](#-conclusion)

---

## 📌 Project Description

The **Farewell Seat Reservation System** is a web-based event management application designed for student farewell ceremonies. It provides a digital floor plan where students can view, select, and reserve their seats in real time.

The seating layout is modeled after a real event room:

| Zone | Description |
|------|-------------|
| 👨‍🏫 **Faculty Area** | 2 premium chairs at the front, reserved for teachers |
| 🪑 **Student Seating** | 38 student seats split into Left (1–19) and Right (20–38) columns |
| 🪵 **Center Tables** | A column of tables running down the middle of the room |

Students must verify their identity via a **6-digit email OTP** before they can book a seat. The system enforces a strict **one seat per student** rule. Teachers/admins have a separate dashboard to manage all bookings.

---

## ✨ Features

### Student Features
- ✅ Register using **Full Name**, **Email**, and **Roll Number**
- ✅ Receive a **6-digit OTP** via email (expires in 5 minutes)
- ✅ Securely log in after OTP verification
- ✅ View the **live interactive seat map** (38 seats)
- ✅ **Book one seat** with a single click and confirmation dialog
- ✅ See their reserved seat **highlighted in real time**
- ✅ View personal booking details in the top banner

### Admin / Teacher Features
- ✅ Password-protected admin dashboard
- ✅ View **all seat bookings** in a table
- ✅ View **all registered students**
- ✅ **Cancel** any individual booking
- ✅ **Reset all seats** with one click

### System Features
- ✅ OTP stored with a **5-minute expiry** (auto-deleted from database via TTL index)
- ✅ **JWT session tokens** (7-day validity)
- ✅ **Atomic seat booking** — prevents double-booking even under concurrent requests
- ✅ Real-time seat status updates on page refresh
- ✅ Fully responsive design (mobile + desktop)

---

## 🏗 System Architecture

```
┌──────────────────────────────────────────────┐
│              CLIENT (Browser)                 │
│   HTML + CSS + Vanilla JavaScript             │
│   Pages: index.html | login.html | admin.html │
└───────────────────┬──────────────────────────┘
                    │ HTTP / REST API
┌───────────────────▼──────────────────────────┐
│              SERVER (Node.js + Express)        │
│   Routes → Controllers → Middleware           │
│   JWT Auth | Admin Password Guard             │
└──────┬───────────────────────┬───────────────┘
       │                       │
┌──────▼───────┐     ┌─────────▼──────────────┐
│   MongoDB     │     │   Nodemailer (Gmail)    │
│   (Mongoose)  │     │   OTP Email Delivery    │
│  3 Collections│     └────────────────────────┘
│ Student | OTP │
│    | Seat     │
└──────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (via Mongoose ODM) |
| **Authentication** | OTP (bcrypt-hashed) + JWT |
| **Email Service** | Nodemailer (Gmail SMTP) |
| **Dev Tools** | Nodemon, dotenv |

---

## 🔐 OTP Authentication Flow

This is the core security mechanism of the system. No passwords are used — identity is verified through the student's email.

```
Student                    Backend                      Email
   │                          │                            │
   │── Enter Name/Email/Roll ─►│                            │
   │                          │── Generate 6-digit OTP     │
   │                          │── Hash OTP with bcrypt      │
   │                          │── Save to DB (5 min TTL)    │
   │                          │── Send OTP via Nodemailer ─►│
   │◄─ "OTP Sent!" ───────────│                            │
   │                          │                       Student receives email
   │── Enter 6-digit OTP ────►│                            │
   │                          │── Find OTP record in DB     │
   │                          │── Check expiry time         │
   │                          │── bcrypt.compare(otp, hash) │
   │                          │   ✅ Match → Verify Student  │
   │                          │── Generate JWT Token        │
   │                          │── Delete OTP from DB        │
   │◄─ JWT Token + Student ───│                            │
   │   (Stored in localStorage)                            │
```

### Why OTP instead of a password?
- Students may be first-time users who don't need a permanent account
- Eliminates forgotten password issues at a time-sensitive event
- Email verification confirms the student's identity automatically

---

## 🪑 Seat Booking Flow

### Seat Layout

```
        ⭐  FACULTY / TEACHER AREA  ⭐
       [👨‍🏫 Faculty 1]  [👩‍🏫 Faculty 2]

  ╔═══════════════════════════════════════╗
  ║  Left Column    │Tables│ Right Column ║
  ║   Seat  1       │ 🪵   │  Seat  20   ║
  ║   Seat  2       │ 🪵   │  Seat  21   ║
  ║   Seat  3       │ 🪵   │  Seat  22   ║
  ║     ...         │ 🪵   │    ...      ║
  ║   Seat 19       │ 🪵   │  Seat  38   ║
  ╚═══════════════════════════════════════╝
```

### Booking Logic (Step-by-Step)

1. Student opens the seat map — all 38 seats are loaded from the database
2. **Green seats** = available, **Red seats** = booked, **Cyan seat** = their own booking
3. Student clicks an available seat → a **confirmation dialog** appears
4. On confirm:
   - Backend checks if the seat is still available (atomic operation)
   - Backend checks if the student already has a booking
   - If both pass → seat is **marked as booked** and linked to the student
5. If the seat was booked by someone else in between → **409 Conflict** error is shown
6. The seat map updates immediately to reflect the new state

### Seat Status Colors

| Color | Meaning |
|-------|---------|
| 🟢 Green | Available — click to book |
| 🔴 Red | Already booked by another student |
| 🔵 Cyan (glowing) | Your reserved seat |
| 🟡 Gold | Faculty chair (non-bookable) |

---

## 👨‍🏫 Admin Features

Access the admin dashboard at `/admin.html`. A password prompt gates access.

| Feature | Description |
|---------|-------------|
| 📋 **View Bookings** | Table of all booked seats with student name, email, roll number, seat number, and booking time |
| 👥 **View Students** | All registered students with verification status and seat assignment |
| ❌ **Cancel Booking** | Remove a specific student's seat booking (seat becomes available again) |
| 🗑 **Reset All Seats** | Cancel ALL bookings at once and make all 38 seats available again |

Admin authentication uses a custom `X-Admin-Password` HTTP header — no login session required.

---

## 📁 Project Structure

```
farewell-seat-system/
│
├── 📁 config/
│   └── db.js                 # MongoDB connection (Mongoose)
│
├── 📁 controllers/
│   ├── authController.js     # Register, verify OTP, resend OTP, get profile
│   ├── seatController.js     # Get all seats, book a seat
│   └── adminController.js   # View bookings/students, cancel, reset
│
├── 📁 middleware/
│   ├── authMiddleware.js     # JWT verification (protect private routes)
│   ├── adminMiddleware.js    # Admin password check
│   └── errorHandler.js      # Global error handler
│
├── 📁 models/
│   ├── Student.js            # Student schema (name, email, roll, seat, verified)
│   ├── OTP.js                # OTP schema with TTL index (auto-expires in 5 min)
│   └── Seat.js               # Seat schema (number, side, isBooked, bookedBy)
│
├── 📁 routes/
│   ├── authRoutes.js         # POST /register, /verify-otp, /resend-otp, GET /me
│   ├── seatRoutes.js         # GET /seats, POST /seats/book
│   └── adminRoutes.js        # GET/DELETE admin endpoints
│
├── 📁 public/                # Static frontend files served by Express
│   ├── 📁 css/
│   │   └── style.css         # Complete premium dark theme CSS
│   ├── 📁 js/
│   │   ├── utils.js          # Shared: API helper, toast, auth helpers
│   │   ├── auth.js           # Login page: OTP flow, digit inputs, timer
│   │   ├── app.js            # Seat map: load seats, render grid, book seat
│   │   └── admin.js          # Admin panel: tables, cancel, reset
│   ├── index.html            # 🪑 Main seat map / floor plan
│   ├── login.html            # 🔐 Student login (OTP flow)
│   └── admin.html            # 👨‍🏫 Admin dashboard
│
├── 📁 utils/
│   ├── generateOTP.js        # Generates a secure 6-digit numeric OTP
│   ├── sendEmail.js          # Nodemailer Gmail SMTP integration
│   ├── seedSeats.js          # Seeds 38 seats into the database
│   └── runTests.js           # End-to-end automated test suite (18 tests)
│
├── server.js                 # Express app entry point
├── .env                      # Environment variables (not committed to Git)
├── .gitignore
└── package.json
```

---

## 🚀 How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher
- [MongoDB](https://www.mongodb.com/) running locally or a MongoDB Atlas URI

### Step 1 — Clone & Install

```bash
cd farewell-seat-system
npm install
```

### Step 2 — Configure Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/farewell-seat-system
JWT_SECRET=your_super_secret_jwt_key
ADMIN_PASSWORD=admin123
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
```

> **Gmail App Password**: Go to [myaccount.google.com → Security → App Passwords](https://myaccount.google.com/apppasswords) to generate one.

### Step 3 — Seed the Database

Run this once to create the 38 seats in the database:

```bash
npm run seed:seats
```

### Step 4 — Start the Server

```bash
# Development (with auto-restart on file changes)
npm run dev

# Production
npm start
```

### Step 5 — Open in Browser

| Page | URL |
|------|-----|
| 🪑 Seat Map | http://localhost:5000 |
| 🔐 Student Login | http://localhost:5000/login.html |
| 👨‍🏫 Admin Panel | http://localhost:5000/admin.html |

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (default: 5000) | Server port |
| `MONGO_URI` | ✅ Yes | MongoDB connection string |
| `JWT_SECRET` | ✅ Yes | Secret key for JWT signing |
| `ADMIN_PASSWORD` | ✅ Yes | Password for admin dashboard |
| `EMAIL_USER` | Optional* | Gmail address for sending OTPs |
| `EMAIL_PASS` | Optional* | Gmail App Password |

> *If `EMAIL_USER` / `EMAIL_PASS` are not set, OTPs are printed to the console (development mode).

---

## 📡 API Reference

### Auth Routes — `/api/auth`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register student & send OTP | Public |
| POST | `/verify-otp` | Verify OTP and get JWT token | Public |
| POST | `/resend-otp` | Resend a new OTP | Public |
| GET | `/me` | Get logged-in student profile | JWT |

### Seat Routes — `/api/seats`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/seats` | Get all 38 seats with status | Public |
| POST | `/seats/book` | Book a seat | JWT |

### Admin Routes — `/api/admin`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/bookings` | Get all seat bookings | Admin |
| GET | `/admin/students` | Get all registered students | Admin |
| DELETE | `/admin/booking/:seatNumber` | Cancel a specific booking | Admin |
| DELETE | `/admin/reset` | Reset all seat bookings | Admin |

---

## 🎯 Conclusion

The **Farewell Seat Reservation System** simulates a real-world event management platform. It demonstrates how modern web applications handle secure user flows, database operations, and interactive UI design.

### Key Learning Outcomes

| Area | What Was Practiced |
|------|--------------------|
| **Backend Development** | RESTful API design with Node.js + Express, MVC architecture |
| **Database Design** | MongoDB schemas, Mongoose ODM, TTL indexes, atomic operations |
| **Authentication** | OTP generation, bcrypt hashing, JWT token lifecycle |
| **Email Integration** | Nodemailer with Gmail SMTP, HTML email templates |
| **Frontend Development** | Vanilla JS DOM manipulation, Fetch API, localStorage session management |
| **UI/UX Design** | Premium dark glassmorphism theme, responsive layout, micro-animations |
| **Security** | Password hashing, token-based auth, admin route protection, input validation |
| **Testing** | Automated end-to-end test suite covering 18 scenarios across all phases |

This project covers the **complete full-stack development lifecycle** — from database modeling and API design to frontend interactivity and user authentication — making it a strong demonstration of practical software engineering skills.

---

<div align="center">

**Built with ❤️ using Node.js · Express · MongoDB · Vanilla JS**

</div>
