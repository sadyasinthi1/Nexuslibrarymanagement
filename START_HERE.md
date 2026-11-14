# START HERE — Team Nexus Mini Library (COMP229, Section 405)

**Sole student:** Sadya Sinthi  
**Course:** COMP229 – Web Application Development (SEC. 405, Fall 2026)  
**Project:** Mini Library Management System (first release)

## Fastest route on Windows

1. **Extract the ZIP.** Do not run code from inside the compressed ZIP.
2. Install Node.js 20+ and either **Docker Desktop** or access to your existing **MongoDB Atlas** database.
3. Open the extracted project folder in VS Code. Open **Terminal → New Terminal**.
4. For **local MongoDB using Docker Desktop**, run:

   ```powershell
   docker compose up -d
   ```

   If using MongoDB Atlas instead, skip Docker and put your **own** connection string in `.env`.
5. Run these commands from the project root:

   ```powershell
   Copy-Item .env.example .env
   node -e "const fs=require('fs'),c=require('crypto');let t=fs.readFileSync('.env','utf8');t=t.replace('change-this-to-a-long-random-secret-before-running',c.randomBytes(32).toString('hex'));fs.writeFileSync('.env',t)"
   npm install
   npm start
   ```

   (If `.env` already exists, do not overwrite it: skip the first two commands.)
6. Open **http://localhost:3000** in your browser.
7. Select **Create one**, register with your own test email and password (8+ characters), then **Add book** → **Edit** → **Delete**.
8. Open a second terminal in the same folder. Run **`npm run test:api`** to verify registration, login, user APIs, book CRUD, and authorization automatically.
9. Run `npm run check` for JavaScript syntax checking.

**Alternative:** On Windows you can double-click `START_HERE_WINDOWS.bat`, but the MongoDB service must already be running and `.env` must have the right MongoDB connection string.

## Exact project requirements covered in code

- MongoDB database (collections `users` and `books` via Mongoose)
- Express + Node.js MVC (models, controllers, routes)
- User registration/login; bcrypt password hashing and signed JWT
- Protected `/api/users/me` GET/PUT/DELETE and admin-only `/api/users` GET
- Full Book CRUD in `/api/books` and `/api/books/:id`
- Owner-only authorization for books (regular users cannot change another account's books)
- Functional HTML/CSS/JavaScript pages (no React required for this assignment)
- Postman collection in `postman/` with token and book ID variables
- API smoke-testing script in `scripts/smoke-test.mjs`

## Optional: load collection in Postman

Postman → Import → select `postman/Team_Nexus_MiniLibrary.postman_collection.json`. Run **Register**, **Login**, **Add book**, **List my books**, **Get book by ID**, **Edit book**, **Delete book**. Registration and Login automatically store the JWT in Postman collection variables. Add Book stores the book ID.

## For the demonstration video

Show http://localhost:3000: Register → Login → Add book → View → Edit → Delete. Show a MongoDB collection (`users`, `books`), a few Postman requests, MVC files, and the GitHub commits. Record real screenshots and replace illustrative pictures in the EDD.

## Do not claim these are finished until you do them

- The code is provided, but **it was not run against a live MongoDB server in this environment**. You must run it, use `npm run test:api`, and record your results.
- Insert your own student ID and actual photo, sign the solo contract PDF, and check presentation.
- Create a **real** Trello/Jira backlog and task board, and export its current snapshot.
- Create and push your **own** GitHub repository and record your own 5–10-minute demo video.
- Your project brief says **4–6 members**. Ask your instructor for permission to submit solo before relying on the single-student contract.

## GitHub upload commands

After creating an empty public/private GitHub repo named `team-nexus-mini-library`:

```powershell
git init
git add .
git commit -m "COMP229 first release: library API and MVC"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/team-nexus-mini-library.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username. GitHub will require you to sign in.

### Security note

Never upload `.env` or passwords, JWT secrets, or Atlas credentials to GitHub. The supplied `.gitignore` excludes `.env`.
