**QUICK SETUP: Open `START_HERE.md`. COMPLETE CODE: `ALL_SOURCE_CODE_COPY_PASTE.md`.**

# Team Nexus - Mini Library Management System

**Solo first-release starter | Sole member: Sadya Sinthi | Student ID: [ADD STUDENT ID]**

Built with Node.js, Express, Mongoose/MongoDB, JWT authentication, MVC folders and a minimal HTML/CSS/JavaScript user interface. This is a **code draft, not a live-tested deployment**.

## Start locally

1. Install Node.js 18+ and Docker Desktop (or a local MongoDB server).
2. Open a terminal in the `TeamNexus_MiniLibrary` folder.
3. Run `docker compose up -d` (unless MongoDB is already running).
4. Copy `.env.example` to `.env`, and set a long unique `JWT_SECRET`. Do not commit `.env`.
5. Run `npm install` and `npm start`.
6. Open http://localhost:3000, create an account, log in and test Add/View/Edit/Delete Book.
7. Import `postman/Team_Nexus_MiniLibrary.postman_collection.json` into Postman; test the routes below.

**No live database and end-to-end API verification has been performed on your machine.** Verify everything before the demo.

## Main endpoints

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET, PUT, DELETE | `/api/users/me` | Authenticated |
| GET, POST | `/api/books` | Authenticated |
| GET, PUT, DELETE | `/api/books/:id` | Owner/admin |
| GET | `/api/users` | Admin |
| GET | `/api/health` | Public |

Postman header for protected routes: `Authorization: Bearer <YOUR_JWT_TOKEN>`.

## Single-member assignment materials

- `assets/Team_Nexus_Logo.pdf` - team logo (valid for a solo project brand).
- `docs/Team_Contract_UNSIGNED.pdf` - one signature line, **must be signed by you**.
- `docs/External_Design_Document_v1.pdf` - four-page draft with wireframes and *illustrative*, not verified, UI preview.
- `docs/Product_Backlog_Snapshot.pdf` - planning draft, **not** a real tool export.
- `docs/Product_Backlog_Import.csv` - one-owner backlog, import into Trello/Jira or copy cards.
- `docs/Team_Nexus_First_Release.pptx` - exactly two slides with one student and one *real* photo placeholder.
- `docs/Demo_Script.md` - one-presenter demonstration script.

## Important next steps

1. If this course requires multi-person teams, confirm with your instructor that a solo team is permitted.
2. Add your actual student ID, sign contract and insert your real current photo. Course: COMP229 - Web Application Development (SEC. 405, Fall 2026).
3. Run the app with MongoDB, check API auth and CRUD and capture **real** screenshots.
4. Create a GitHub repo, push real commits from **your own** account (no fabricated members).
5. Create a real Trello/Jira Product Backlog and Task Board and export a genuine PDF snapshot.
6. Record a clear 5-10 minute demo and submit the real video URL and repository URL.

This ZIP is designed to reduce your setup/documentation time, but it cannot replace instructor permission, real verification or proof of completed external steps.


## Course information
- **Course code:** COMP229
- **Course name:** Web Application Development
- **Section:** 405
- **Term:** Fall 2026 (26F)
- **Solo member:** Sadya Sinthi
- **Student ID:** [301281777]
