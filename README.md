<div align="center">

  # 🚀 Planora
  ### Next-Generation Workspace & Project Management Platform

  Planora is a modern, high-velocity project management platform built for agile teams to plan, track, and ship high-impact software with clarity.

  <p align="center">
    <img src="https://img.shields.io/badge/React-19.1.1-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-v4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS v4" />
    <img src="https://img.shields.io/badge/Vite-v7.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Clerk-Authentication-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" alt="Clerk" />
    <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License MIT" />
  </p>

</div>

---

## 📑 Table of Contents
- [✨ Key Features](#-key-features)
- [🛠️ Tech Stack](#-tech-stack)
- [📂 Project Architecture](#-project-architecture)
- [🚀 Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Server Setup](#2-server-setup)
  - [3. Client Setup](#3-client-setup)
- [🔐 Environment Variables](#-environment-variables)
- [📡 API & Background Workflows](#-api--background-workflows)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## ✨ Key Features

- 🏢 **Multi-Tenant Workspaces**: Create, switch, and manage multiple workspaces powered by Clerk Organizations.
- 📊 **Executive Analytics & Metrics**: Real-time project overview charts powered by Recharts (task distributions, completion ratios, project health).
- 🎯 **Project Lifecycle Tracking**: Create projects with custom priorities (`LOW`, `MEDIUM`, `HIGH`), status tracking (`ACTIVE`, `PLANNING`, `COMPLETED`, `ON_HOLD`, `CANCELLED`), assigned project leads, and member rosters.
- 📋 **Granular Task Management**: Break down projects into tasks, bugs, features, and improvements with due dates, priority tags, and dynamic status boards (`TODO`, `IN_PROGRESS`, `DONE`).
- 💬 **Threaded Task Comments**: Real-time discussions and updates directly inside individual task views.
- ⚡ **Event-Driven Automations**: Background workflows orchestrated with **Inngest** for automated Clerk user/organization sync, assignment notifications, and overdue reminders.
- 📬 **Email Notification Engine**: Seamless transactional emails via Brevo/Nodemailer notifying members of task allocations and due-date alerts.
- 🌓 **Adaptive Theming & Sleek UI**: Built with Tailwind CSS v4 featuring Dark & Light mode toggle, mobile-responsive sliding navigation drawer, and polished micro-interactions.

---

## 🛠️ Tech Stack

### Frontend (`/client`)
| Technology | Description |
| :--- | :--- |
| **React 19** | Modern UI framework utilizing the latest concurrent and component features |
| **Vite 7** | Lightning-fast HMR and optimized production bundling |
| **Tailwind CSS v4** | Next-generation utility-first styling with native CSS token integration |
| **Redux Toolkit** | Centralized predictable state management across workspaces, themes, and tasks |
| **React Router v7** | Client-side routing with nested layouts and protected navigation |
| **Clerk React** | Enterprise-grade user authentication and multi-tenant organization management |
| **Lucide React** | Consistent, lightweight SVG icon system |
| **Recharts** | Declarative charting library for interactive dashboard analytics |

### Backend (`/server`)
| Technology | Description |
| :--- | :--- |
| **Node.js & Express 5** | High-performance RESTful API backend |
| **Prisma ORM** | Type-safe database queries, schema migrations, and relational modeling |
| **Neon PostgreSQL** | Serverless cloud PostgreSQL with connection pooling |
| **Inngest** | Resilient background job queue for event-driven functions and delayed workflows |
| **Nodemailer & Brevo** | Robust transactional email delivery pipeline |

---

## 📂 Project Architecture

```plaintext
Planora/
├── client/                     # Frontend Single Page Application
│   ├── public/                 # Static assets & favicons
│   ├── src/
│   │   ├── assets/             # Images, sample data & static utilities
│   │   ├── components/         # Reusable UI widgets & modals (Sidebar, Navbar, TaskDialogs)
│   │   ├── configs/            # Axios API client & endpoints configuration
│   │   ├── features/           # Redux Toolkit state slices (workspace, theme)
│   │   ├── pages/              # Primary views (Dashboard, Projects, Team, Details)
│   │   ├── App.jsx             # Route definitions & global layout wrapper
│   │   └── main.jsx            # React root mount & providers
│   ├── package.json
│   └── vite.config.js
│
└── server/                     # Backend API & Worker Engine
    ├── config/                 # Prisma database client & Nodemailer transporter
    ├── controllers/            # Route controllers for workspaces, projects, tasks, comments
    ├── inngest/                # Inngest serverless functions & webhook listeners
    ├── middlewares/            # Clerk auth & route protection middlewares
    ├── prisma/                 # Prisma schema definition & migrations
    ├── routes/                 # Express API route modules
    ├── package.json
    └── server.js               # Express application entry point
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**, **pnpm**, or **yarn**
- **PostgreSQL Database** (e.g. Neon, Supabase, or local PostgreSQL)
- **Clerk Account** (for authentication keys)
- **Brevo / SMTP Account** (optional for email notifications)

---

### 1. Clone Repository

```bash
git clone https://github.com/Saksham09-cloud/Project-management.git planora
cd planora
```

---

### 2. Server Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure server environment variables in `server/.env`:
   *(Ensure `DATABASE_URL`, `DIRECT_URL`, `CLERK_SECRET_KEY`, and `INNGEST_SIGNING_KEY` are provided).*

4. Generate Prisma client and sync database schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Start the backend development server:
   ```bash
   npm run server
   ```
   *The server runs by default on `http://localhost:5001`.*

---

### 3. Client Setup

1. Open a new terminal and navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure client environment variables in `client/.env`:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   VITE_BASEURL=http://localhost:5001
   ```

4. Launch the Vite dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔐 Environment Variables

### Server (`server/.env`)
| Variable | Description | Required |
| :--- | :--- | :---: |
| `PORT` | Port number for Express server (default: `5001`) | No |
| `DATABASE_URL` | Pooled connection string to PostgreSQL database | **Yes** |
| `DIRECT_URL` | Direct unpooled connection string for Prisma migrations | **Yes** |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | **Yes** |
| `CLERK_SECRET_KEY` | Clerk secret backend key | **Yes** |
| `CLERK_WEBHOOK_SECRET` | Secret key for verifying Clerk webhooks | **Yes** |
| `INNGEST_SIGNING_KEY` | Signing key for Inngest event endpoints | **Yes** |
| `INNGEST_EVENT_KEY` | Inngest event dispatch key | **Yes** |
| `SENDER_EMAIL` | From email address for task notifications | Optional |
| `SMTP_USER` | SMTP username / API login (e.g. Brevo) | Optional |
| `SMTP_PASS` | SMTP password / API secret key | Optional |

### Client (`client/.env`)
| Variable | Description | Required |
| :--- | :--- | :---: |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend publishable key | **Yes** |
| `VITE_BASEURL` | URL of the backend API (e.g., `http://localhost:5001`) | **Yes** |

---

## 📡 API & Background Workflows

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/workspace` | `GET`, `POST`, `DELETE` | Workspace listing, creation, and member operations |
| `/api/projects` | `GET`, `POST`, `PUT`, `DELETE` | Project CRUD, lead assignment, and status updates |
| `/api/tasks` | `GET`, `POST`, `PUT`, `DELETE` | Task creation, status board updates, assignees |
| `/api/comments` | `GET`, `POST`, `DELETE` | Threaded discussions on tasks |
| `/api/inngest` | `POST`, `PUT`, `GET` | Inngest serverless event listener and job runner |

---

## 🤝 Contributing

Contributions are always welcome! Whether it's reporting an issue, proposing an improvement, or submitting a feature pull request:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please read [client/CONTRIBUTING.md](./client/CONTRIBUTING.md) for full guidelines.

---

## 📜 License

Distributed under the **MIT License**. See `client/LICENSE.md` for more information.
