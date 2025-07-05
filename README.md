# Game Tracker Backend – Express + MongoDB API

This is the backend API for the [Game Tracker](https://github.com/gysagsohn/game-tracker-client) project — a full-stack MERN application to track the results of card and board games played with friends. The backend provides secure user authentication, a game database, match result recording, and friend connection features.

---

## Tech Stack

- Node.js
- Express
- MongoDB + Mongoose
- JSON Web Token (JWT)
- dotenv
- bcrypt
- CORS
- OAuth (Google & Facebook)
- DiceBear Avatars (auto-generated user profile icons)
- Resend (email invite + match confirmation service)

---

## Folder Structure
```bash
game-tracker-server/
├── src/
│   ├── controllers/     # Request logic (handlers)
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Auth / error handling
│   ├── services/        # Email, external APIs
│   ├── config/          # DB + OAuth setup
│   └── server.js        # App (express instance)
│   └── server.js        # App entry point
├── .env
├── .gitignore
├── package.json
├── README.md
```

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

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret

FACEBOOK_APP_ID=your_fb_app_id
FACEBOOK_APP_SECRET=your_fb_app_secret

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=your_verified_sender_email
```
4. Start the server:
``` bash
npm run dev
```

##  Data Models (Mongoose Schema Plan)

## Data Models (Mongoose Schema Plan)

### User Model

| Field          | Type     | Description                                      |
|----------------|----------|--------------------------------------------------|
| `firstName`    | String   | Required                                         |
| `lastName`     | String   | Required                                         |
| `email`        | String   | Required, unique — used for login               |
| `password`     | String   | Required unless using OAuth                     |
| `authProvider` | String   | `"local"` \| `"google"` \| `"facebook"`         |
| `profileIcon`  | String   | DiceBear URL based on user name/email           |
| `friends`      | [ObjectId] | Users this person is connected with            |
| `friendRequests` | [Subdoc] | Incoming/outgoing requests with status         |
| `stats`        | Object   | `{ wins: Number, losses: Number, mostPlayed: String }` |
| `role`         | String   | `"user"` or `"admin"` (for moderation)          |
| `createdAt`    | Date     | Timestamp                                       |

#### FriendRequests Subdoc

```js
{
  user: ObjectId, // the sender or receiver
  status: "Pending" | "Accepted" | "Rejected"
}
```

### Match Model

| Field         | Type       | Description                                      |
|---------------|------------|--------------------------------------------------|
| `game`        | ObjectId   | Ref to Game document                             |
| `players`     | [Subdoc]   | Array of player results                          |
| `matchStatus` | String     | `"Pending"` or `"Confirmed"` — confirmation logic |
| `createdBy`   | ObjectId   | Ref to User who submitted the match              |
| `date`        | Date       | Date played — defaults to `Date.now()`           |
| `updatedAt`   | Date       | Used to track when match was last edited         |

#### Players Subdoc

```js
{
  user: ObjectId,        // Only if they are a registered user
  name: String,          // Use this if not a user
  email: String,         // Use this if not a user
  result: "Win" | "Loss" | "Draw",
  score: Number,
  confirmed: Boolean,
  invited: Boolean       // If user was sent an invite
}
```

Either user or email+name must be present.

### Game Model
```
| Field         | Type     | Description                                      |
|---------------|----------|--------------------------------------------------|
| `title`       | String   | Required — name of the game                      |
| `icon`        | String   | Optional — only used for preloaded games        |
| `maxPlayers`  | Number   | Optional — used for validation/input UI         |
| `isDefault`   | Boolean  | True for seeded games (Monopoly Deal, etc.)     |
| `createdBy`   | ObjectId | Optional — present if game was added by a user  |
```

> Seeded games: **Monopoly Deal**, **Catan**, **Phase 10**, **Skip-Bo**


Match edits will reset matchStatus: "Pending" until all players confirm again.

If a player's email is entered (instead of a user ID), an invite will be sent via Resend.

## Middleware Overview
```

| Middleware Name       | Purpose                                                      |
|------------------------|--------------------------------------------------------------|
| `authMiddleware`       | Verifies JWT, attaches user to `req.user`                    |
| `privacyGuard`         | Blocks access to other users’ private data                   |
| `ownershipCheck`       | Ensures users can only edit/delete their own matches/data    |
| `friendsOnlyAccess`    | Ensures users can only add friends they’ve connected with    |
| `matchConfirmationCheck` | Blocks match edits unless all players reconfirm            |
| `adminCheck`           | Restricts certain actions (like deleting default games) to admin users |
```


## Planned API Routes (MVP)


### `/auth` – Auth Routes
```
| Method | Route           | Description                |
|--------|------------------|----------------------------|
| POST   | `/signup`        | Create user account        |
| POST   | `/login`         | Login user + issue token   |
| GET    | `/google`        | Google OAuth login         |
| GET    | `/facebook`      | Facebook OAuth login       |
```


### `/users` – User Routes
```
| Method | Route                      | Description                     |
|--------|-----------------------------|---------------------------------|
| GET    | `/`                         | Search for users (by name/email)|
| GET    | `/:id`                      | View user profile               |
| PUT    | `/:id`                      | Update user profile             |
| DELETE | `/:id`                      | Admin delete user               |
| POST   | `/friends/:id`              | Send friend request             |
| PUT    | `/friends/:id/accept`       | Accept friend request           |
```

### `/games` – Game Routes
```
| Method | Route          | Description                        |
|--------|----------------|------------------------------------|
| GET    | `/`            | List all games                     |
| POST   | `/`            | Add new game (users or admin)      |
| DELETE | `/:id`         | Admin delete game                  |
```


### `/matches` – Match Routes
```
| Method | Route           | Description                             |
|--------|------------------|-----------------------------------------|
| GET    | `/`              | Get current user's match history        |
| POST   | `/`              | Log new match (with invites if needed)  |
| PUT    | `/:id`           | Edit match (resets status to "Pending") |
| GET    | `/:id`           | Get single match details                |
| POST   | `/:id/confirm`   | Confirm a match if you're a player      |
```

### `/admin` – (Optional)
- Protected by `adminCheck` middleware  
- For viewing system stats, user list, deleting games, etc.

## Related Repositories
[Frontend: game-tracker-client](https://github.com/gysagsohn/game-tracker-client)

## Author
Built by Gy Sohn as part of a career change full-stack portfolio project.

