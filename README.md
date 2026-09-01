# 🗂️ DonClaudio's Lechon House

## 📖 Project Overview

**DonClaudio's Lechon House** is a digital ordering and management system for a restaurant. It provides a public storefront where customers can browse the menu, place orders, and track their order history, as well as role-based dashboards that let **owners** and **cashiers** run the business end-to-end.

This project is a **monorepo** containing the **Express.js** backend API and **Next.js** frontend application.

### Key Features

- **Customer** — Browse the menu, place orders, check out, and view order history.
- **Owner** — Manage products/inventory, cashiers, promos, and customize the storefront appearance.
- **Cashier** — Handle front-of-house orders from the cashier dashboard.
- **Authentication** — Sign up / sign in, email verification, forgot & reset password.
- **Role-based access** — Separate layouts and dashboards for customers, owners, and cashiers.

### Tech Stack

| Layer    | Technology         |
|----------|--------------------|
| Backend  | Express.js (Node)  |
| Frontend | Next.js (React)    |

---

## 📁 Project Structure

```
/
├── backend/          # Express.js REST API
├── frontend/         # Next.js Application
└── README.md
```

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Tobikun11-Arch/DonClaudios.githttps://github.com/Tobikun11-Arch/DonClaudios.git
cd DonClaudios
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env     # configure your environment variables
npm install
npm run dev
```

Backend runs on: `http://localhost:5000`

### 3. Setup Frontend

```bash
cd frontend
cp .env.example .env.local     # configure your environment variables
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

---

## 🛠️ Tech Stack

| Layer    | Technology         |
|----------|--------------------|
| Backend  | Express.js (Node)  |
| Frontend | Next.js (React)    |

---

## 📂 Backend — `./backend`

Built with **Express.js**.

### Folder Structure (not finished)

```
backend/
├── src/
│   ├── controllers/    # Route handlers
│   ├── routes/         # API route definitions
│   ├── middleware/      # Custom middleware
│   ├── models/         # Data models
│   └── index.js        # Entry point
├── .env.example
└── package.json
```

### Available Scripts

```bash
npm run dev       # Start dev server with nodemon
npm run start     # Start production server
npm run lint      # Run linter
```

---

## 📂 Frontend — `./frontend`

Built with **Next.js**.

### Folder Structure

```
frontend/
├── app/                  # App Router entrypoints & layouts
│   ├── (auth)/           # Auth routes
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (customer)/       # Customer routes
│   │   ├── customer/dashboard/page.tsx
│   │   └── layout.tsx
│   ├── (owner)/          # Owner routes
│   │   ├── owner/dashboard/page.tsx
│   │   └── layout.tsx
│   ├── (public)/         # Public routes
│   │   ├── order/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/           # Generic UI components
│   └── ui/
│       ├── button.tsx
│       └── card.tsx
├── config/               # App-wide configuration
├── features/             # Feature modules
│   ├── auth/
│   ├── customer/
│   ├── home/
│   │   ├── components/
│   │   │   ├── About.tsx
│   │   │   ├── Contact.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   ├── Highlights.tsx
│   │   │   └── Promo.tsx
│   │   └── index.ts
│   └── owner/
├── lib/                  # Utilities & helpers
│   └── utils.ts
├── public/               # Static assets
│   ├── assets/logo.png
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── shared/               # Shared modules
│   ├── components/layout/
│   │   ├── Footer.tsx
│   │   └── Header.tsx
│   ├── constants/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── .gitignore
├── components.json
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

### Available Scripts

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run linter
```

---

## 🌿 Git Branching Workflow

### Branch Structure

```
production
└── development
    ├── feature/homepage    
    ├── feature/user-auth
    ├── fix/header-bug
    └── hotfix/broken-api             # (urgent production fixes)
    └── chores/update-dependencies    # (configs, deps, refactors)
```

### Main Branches

| Branch        | Purpose                                      |
|---------------|----------------------------------------------|
| `production`  | Stable, live/production-ready code           |
| `development` | Active development and integration testing   |

> ⚠️ **Never commit directly to `production` or `development`.**

---

### Supporting Branches

| Type        | Pattern                          | Example                          |
|-------------|----------------------------------|----------------------------------|
| Feature     | `feature/<short-description>`    | `feature/homepage`               |
| Bug Fix     | `fix/<short-description>`        | `fix/login-redirect`             |
| Hotfix      | `hotfix/<short-description>`     | `hotfix/broken-checkout`         |
| Release     | `release/<version>`              | `release/v1.2.0`                 |
| Chore       | `chore/<short-description>`      | `chore/update-dependencies`      |

---

### Workflow Step-by-Step

#### Starting a new feature or page

```bash
# 1. Always branch off development
git checkout development
git pull origin development

# 2. Create your branch
git checkout -b feature/homepage

# 3. Work on your changes, then commit
git add .
git commit -m "feat: add homepage layout and hero section"

# 4. Push your branch
git push origin feature/homepage
```

#### Merging back to development

```bash
# Open a Pull Request: feature/homepage → development
# Get it reviewed and approved before merging
```

#### Releasing to production

```bash
# Once development is stable and tested:
# Open a Pull Request: development → production
```

#### Hotfix (urgent production fix)

```bash
# Branch off production directly
git checkout production
git pull origin production
git checkout -b hotfix/broken-api

# Fix, commit, push
git commit -m "fix: resolve broken API endpoint"
git push origin hotfix/broken-api

# PR into production, then backmerge into development
```

---

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     New feature
fix:      Bug fix
chore:    Maintenance, deps, config
style:    Formatting, no logic change
refactor: Code restructure, no behavior change
docs:     Documentation updates
```

**Examples:**
```bash
git commit -m "feat: add homepage hero section"
git commit -m "fix: resolve mobile navbar overflow"
git commit -m "chore: update next.js to v15"
git commit -m "docs: update README setup steps"
```

---

## 🤝 Contributing

1. Branch off `development`
2. Follow the branch naming and commit conventions above
3. Open a Pull Request into `development`
4. Request a code review before merging

---