# 10x-Cards

> Fast flashcard creation (Polish → Polish) with AI-assisted generation and built-in spaced repetition scheduling.

[![Build](https://img.shields.io/badge/build-GitHub%20Actions-informational.svg)](#)
[![Status](https://img.shields.io/badge/status-MVP%20in%20development-blue.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](#license)

---

## Table of Contents

- [10x-Cards](#10x-cards)
  - [Table of Contents](#table-of-contents)
  - [Project description](#project-description)
  - [Tech stack](#tech-stack)
  - [Getting started locally](#getting-started-locally)
    - [Prerequisites](#prerequisites)
    - [1) Clone and install](#1-clone-and-install)
    - [2) Configure environment](#2-configure-environment)
    - [3) Run the app](#3-run-the-app)
    - [4) Build for production](#4-build-for-production)
    - [Linting \& formatting](#linting--formatting)
  - [Available scripts](#available-scripts)
  - [Project scope](#project-scope)
    - [MVP — in scope](#mvp--in-scope)
    - [Out of scope (initially)](#out-of-scope-initially)
    - [Constraints](#constraints)
  - [Project status](#project-status)
  - [License](#license)

---

## Project description

**10x-Cards** is a web application that turns long Polish texts (1,000–50,000 characters) into **AI-generated flashcard candidates** that you can quickly **accept, edit, or reject**. Accepted cards are saved in your account and **automatically added to a spaced-repetition scheduler** so you can start learning the same day. A lightweight analytics layer tracks **AI-acceptance rate** and **AI-usage rate** to validate the quality and usefulness of AI-assisted creation.

**Who it’s for:** self-learners working with their own materials (students, professionals preparing for certifications, language learners).

**Why it matters:** creating high-quality cards from long materials is time-consuming. 10x-Cards streamlines generation and review while keeping you in control of the content.

**Highlights**

- Paste Polish text → generate candidates with clear limits and progress feedback.
- Inline review UI with keyboard access (accept / edit / reject, pagination).
- Batch-save only accepted items; duplicate detection on save.
- CRUD for saved cards with full-text search and sorting.
- Learning sessions powered by an open-source spaced-repetition scheduler.
- Accounts, authentication, GDPR/RODO controls (account & data deletion).
- Basic accessibility and responsive web design.

> For full product requirements (FR-01…FR-20, US-001…US-034) and KPIs, see the PRD in the repository.

---

## Tech stack

- **Frontend:** Astro 5, React 19 (for interactive islands), TypeScript 5, Tailwind CSS 4, shadcn/ui components.
- **Backend/BaaS:** Supabase (PostgreSQL, authentication, SDKs).
- **AI Gateway:** OpenRouter.ai (broad model choice + spend limits).
- **CI/CD & Hosting:** GitHub Actions pipelines; deploy as a Docker image (e.g., DigitalOcean).

> The repository also includes modern developer tooling: ESLint 9 with plugins (incl. React Compiler), Prettier (with Astro plugin), Husky + lint-staged, and TypeScript ESLint.

---

## Getting started locally

### Prerequisites

- **Node.js:** use the version specified in `.nvmrc`

  ```bash
  nvm use         # picks up the Node version from .nvmrc
  ```

- **npm** (comes with Node). You can substitute `pnpm`/`yarn` if preferred.

### 1) Clone and install

```bash
git clone <your-fork-or-repo-url>
cd 10x-cards
npm install
```

### 2) Configure environment

Create a `.env` file in the project root with the following variables (example names shown — adjust to your configuration):

```bash
# Supabase (Database + Auth)
SUPABASE_URL=<your-supabase-project-url>
SUPABASE_KEY=<your-supabase-anon-key>

# OpenRouter (AI generation)
OPENROUTER_API_KEY=<your-openrouter-api-key>

```

> Tips:
>
> - Keep keys out of version control.
> - For local development with Supabase, you can use a hosted project or a local Supabase stack.

### 3) Run the app

```bash
npm run dev
```

Open the printed local URL in your browser.

### 4) Build for production

```bash
npm run build
npm run preview   # serve the built site locally
```

### Linting & formatting

```bash
npm run lint
npm run lint:fix
npm run format
```

---

## Available scripts

| Script     | Command            | Description                                         |
| ---------- | ------------------ | --------------------------------------------------- |
| Dev server | `npm run dev`      | Starts Astro dev server with hot reload.            |
| Build      | `npm run build`    | Production build.                                   |
| Preview    | `npm run preview`  | Serves the production build locally.                |
| Astro CLI  | `npm run astro`    | Direct access to the Astro CLI.                     |
| Lint       | `npm run lint`     | Runs ESLint across the project.                     |
| Lint (fix) | `npm run lint:fix` | ESLint with auto-fix.                               |
| Format     | `npm run format`   | Prettier write on supported files (incl. `.astro`). |

---

## Project scope

### MVP — in scope

- **AI generation** of flashcard candidates from Polish text (1k–50k chars) with progress/timeout handling and retry.
- **Review interface** with pagination, inline edit/validation (≤200 chars front, ≤500 chars back), accept/reject, batch-save.
- **Saved cards** list with full-text search, sort, edit, delete; audit log (metadata only).
- **Spaced-repetition** integration: new cards auto-enrolled; “Today’s session” with reveal + quality ratings and scheduler updates.
- **Accounts & security:** registration, login, logout, password reset; RLS per user; CSRF/XSS protections; rate limiting; session expiry.
- **Analytics:** real-time counters for generated/accepted/edited/rejected/saved; **AI-acceptance rate** & **AI-usage rate**.
- **Compliance & privacy:** GDPR/RODO controls incl. irreversible account/data deletion; privacy policy link.
- **Quality bar:** responsive web (desktop & mobile-web), keyboard navigation, ARIA labels, cross-browser support (latest Chrome/Firefox/Edge/Safari).

### Out of scope (initially)

- Custom scheduler algorithm (use open-source implementation).
- Non-text media in cards; rich imports (PDF/DOCX).
- Public sharing/publishing; external LMS integrations.
- Native mobile apps.
- Bulk export CSV (deferred) and URL-to-text import (optional/if implemented later).

### Constraints

- UI and card content initially **Polish-only** with i18n layer ready for future locales.
- Input outside 1k–50k chars is blocked with clear messaging.
- Cost monitoring for LLM usage with alerting (no user-visible limits in MVP).

---

## Project status

**MVP in development.** Success is measured primarily by:

- **AI-acceptance rate** ≥ 75% (share of AI-generated candidates that users accept & save).
- **AI-usage rate** ≥ 75% (share of new cards created via AI vs. all new cards).

**Target environments**

- Browsers: latest two versions of Chrome, Firefox, Edge, Safari.
- Accessibility: keyboard navigation, visible focus states, ARIA labels for key UI.

---

## License

This project is released under the **MIT License**.

---

_Made with Astro + React, powered by Supabase and OpenRouter._
