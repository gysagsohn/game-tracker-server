# Game Tracker Backend – Express + MongoDB API

This is the backend API for the [Game Tracker](https://github.com/gysagsohn/game-tracker-client) project — a full-stack MERN application to track the results of card and board games played with friends. The backend provides secure user authentication, a game database, match result recording, and friend connection features.

---

## ⚙️ Tech Stack

- Node.js
- Express
- MongoDB + Mongoose
- JSON Web Token (JWT)
- dotenv
- bcrypt
- CORS

---

## 🗂 Folder Structure
game-tracker-server/
├── src/
│ ├── controllers/ # Request logic (handlers)
│ ├── models/ # Mongoose schemas
│ ├── routes/ # API routes
│ ├── middleware/ # Auth / error handling
│ ├── config/ # DB connection
│ └── server.js # App entry point
├── .env
├── .gitignore
├── package.json

## Getting Started (Local Dev)
1. Clone the repo:
``` bash
git clone git@github.com:gysagsohn/game-tracker-server.git
```
2. Install dependencies:
``` bash
npm install
```
3. Create a .env file at the root with the following:
``` bash
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=3001
```
4. Start the server:
``` bash
npm run dev
```

## Planned API Routes (MVP)

**Auth**
POST /auth/signup – Register new user

POST /auth/login – Login + return JWT

**Users**
GET /users/ – Search users

POST /users/friends/:id – Send friend request

PUT /users/friends/:id/accept – Accept friend request

**Games**
GET /games/ – List all games

POST /games/ – Add new game

**Matches**
GET /matches/ – Get match history

POST /matches/ – Submit a new match

GET /matches/:id – Get single match detail

## Related Repositories
Frontend: game-tracker-client