# Game Tracker Backend – Express + MongoDB API

This is the backend API for [Game Tracker](https://github.com/gysagsohn/game-tracker-client), a full-stack MERN application that allows friends to:

The frontend repo can be found at [Frontend: game-tracker-client](https://github.com/gysagsohn/game-tracker-client)

- Track card and board game results
- Log match scores (with guests)
- Confirm match outcomes
- View user stats and history
- Send friend requests and get match invites
- Create and manage games

This repo uses Express, MongoDB, and JWT-based authentication. Google OAuth, email verification, and email-based match invites are fully supported.


## Tech Stack

- Backend: Node.js, Express, MongoDB + Mongoose
- Auth: JWT, Google OAuth via Passport
- Security: bcrypt, role-based auth, privacy guards
- Email: Nodemailer + Gmail App Password
- Utils: DiceBear Avatars, dotenv, express-rate-limit


## Folder Structure
```bash
game-tracker-server/
├── src/
│   ├── config/         # DB setup
│   ├── controllers/    # Route logic (auth, user, session, game, admin)
│   ├── middleware/     # Auth, role, and privacy guards
│   ├── models/         # Mongoose models + subdocs
│   ├── routes/         # Express routes
│   ├── scripts/        # Seed/reset DB scripts
│   ├── index.js        # Starts server and connects DB
│   └── server.js       # Express app instance
├── .env
├── .gitignore
├── package.json
└── README.md
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

EMAIL_FROM=your_gmail@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password
```
4. Start the server:

``` bash
npm run dev
```

## Authentication
**JWT Token Auth (Local Signup/Login)**
- Email verification required
- Login blocked if suspended or unverified

**Google OAuth**
- Uses /auth/google + Passport.js
- Redirects with token on success


## Data Models (Mongoose Schema Plan)

### User Model

| Field            | Type         | Description                                                  |
|------------------|--------------|--------------------------------------------------------------|
| `firstName`      | String       | Required                                                     |
| `lastName`       | String       | Required                                                     |
| `email`          | String       | Required, unique — used for login                            |
| `password`       | String       | Required unless using OAuth                                  |
| `authProvider`   | String       | `"local"` \| `"google"` \| `"facebook"`                      |
| `profileIcon`    | String       | DiceBear URL based on user name/email                        |
| `friends`        | [ObjectId]   | Array of User IDs — connected friends                        |
| `friendRequests` | [Subdoc]     | List of friend request objects with status                   |
| `stats`          | Object       | `{ wins: Number, losses: Number, mostPlayed: String }`       |
| `role`           | String       | `"user"` or `"admin"`                                        |
| `isEmailVerified`| Boolean      | Email must be verified to log in                             |
| `isSuspended`    | Boolean      | If true, account is locked                                   |
| `notifications`  | [Subdoc]     | Messages like friend requests or match invites               |
| `createdAt`      | Date         | Timestamp — when account was created                         |


### FriendRequest Subdocument


| Field      | Type     | Description                            |
|------------|----------|----------------------------------------|
| `user`     | ObjectId | Ref to sender or receiver              |
| `status`   | String   | `"Pending"` \| `"Accepted"` \| `"Rejected"` |



### Session (Match) Model

| Field         | Type         | Description                                              |
|---------------|--------------|----------------------------------------------------------|
| `game`        | ObjectId     | Ref to Game document                                     |
| `players`     | [Subdoc]     | Array of embedded player results                         |
| `notes`       | String       | Optional text notes about the match                      |
| `matchStatus` | String       | `"Pending"` \| `"Confirmed"` — based on player confirms  |
| `createdBy`   | ObjectId     | Ref to the user who logged the match                     |
| `date`        | Date         | Date the match was played                                |
| `createdAt`   | Date         | Automatically added by Mongoose                          |
| `updatedAt`   | Date         | Automatically updated on match edits                     |

#### Players Subdoc


| Field       | Type       | Description                                                |
|-------------|------------|------------------------------------------------------------|
| `user`      | ObjectId   | Ref to registered User — `null` for guests                 |
| `name`      | String     | Required for all players (used for guests)                 |
| `email`     | String     | Optional — guest invite and account sync                   |
| `score`     | Number     | Numeric score or rank                                      |
| `result`    | String     | `"Win"` \| `"Loss"` \| `"Draw"`                            |
| `confirmed` | Boolean    | True if player has confirmed result                        |
| `invited`   | Boolean    | True if invite email was sent to guest  


Either user or email+name must be present.

### Game Model

| Field            | Type     | Description                                            |
|------------------|----------|--------------------------------------------------------|
| `name`           | String   | Required, unique — game title                          |
| `description`    | String   | Optional description                                   |
| `category`       | String   | `"Card"` \| `"Board"` \| `"Word"` \| `"Other"`         |
| `customCategory` | String   | Optional — used if `category === "Other"`              |
| `maxPlayers`     | Number   | Max allowed players for this game                      |
| `minPlayers`     | Number   | Minimum required players                               |
| `createdBy`      | ObjectId | Ref to user who created the game (if not default)      |
| `isCustom`       | Boolean  | True if added by user, false if seeded by admin        |



> Seeded games: **Monopoly Deal**, **Catan**, **Phase 10**, **Skip-Bo**


Match edits will reset matchStatus: "Pending" until all players confirm again.

If a player's email is entered (instead of a user ID), an invite will be sent via Resend.


## Notification Model

| Field       | Type       | Description                                               |
|-------------|------------|-----------------------------------------------------------|
| `recipient` | ObjectId   | Ref to the user receiving the notification               |
| `type`      | String     | `"FriendRequest"` \| `"FriendAccepted"`                  |
| `message`   | String     | Optional message body                                    |
| `link`      | String     | Optional frontend link (e.g., `/match/:id`)              |
| `isRead`    | Boolean    | True if the notification has been viewed                 |
| `createdAt` | Date       | Timestamp                                                 |


## Guest Player Sync
If a guest is added by email and later signs up with that email:
- All guest matches are updated to link to their new account
- Guest stats and history become available to them

## User Stats Endpoint
```
GET /users/:id/stats
```
Returns:
- Wins, losses, draws
- Most played game
- Favorite opponent
- Best win rate opponent (min 2 matches)

## Middleware Overview

| Middleware Name          | Purpose                                                                 |
|--------------------------|-------------------------------------------------------------------------|
| `authMiddleware`         | Verifies JWT and attaches the user object to `req.user`                 |
| `adminCheck`             | Restricts access to users with `role: "admin"`                          |
| `privacyGuard`           | Allows users to access only their own data (e.g., `/users/:id`)         |
| `matchPrivacyGuard`      | Allows access to a match only if the user is a registered player        |
| `rateLimiter`            | Limits the number of requests (e.g., max 5 login/signup attempts)       |


## Planned API Routes (MVP)


### `/auth` – Auth Routes

| Method | Route                       | Description                                        |
|--------|-----------------------------|----------------------------------------------------|
| POST   | `/auth/signup`              | Create a new user account                          |
| POST   | `/auth/login`               | Log in a user and return JWT                       |
| GET    | `/auth/google`              | Begin Google OAuth flow                            |
| GET    | `/auth/facebook`            | Begin Facebook OAuth flow                          |
| GET    | `/auth/verify-email`        | Verify email via token link                        |
| POST   | `/auth/resend-verification-email` | Resend email verification link               |
| POST   | `/auth/forgot-password`     | Send password reset link                           |
| POST   | `/auth/reset-password`      | Reset user password via token                      |




### `/users` – User Routes

| Method | Route                  | Description                                 |
|--------|------------------------|---------------------------------------------|
| GET    | `/users`               | Get all users                               |
| GET    | `/users/:id`           | Get user profile by ID                      |
| PUT    | `/users/:id`           | Update user profile                         |
| DELETE | `/users/:id`           | Delete user (self or admin)                 |
| GET    | `/users/:id/stats`     | Get match statistics for a user             |


### `/games` – Game Routes

| Method | Route            | Description                             |
|--------|------------------|-----------------------------------------|
| GET    | `/games`         | Get all games (default and user-added)  |
| POST   | `/games`         | Add a new game                          |
| PUT    | `/games/:id`     | Edit a game                             |
| DELETE | `/games/:id`     | Delete a game                           |




### `/matches` – Match Routes

| Method | Route                       | Description                                             |
|--------|-----------------------------|---------------------------------------------------------|
| GET    | `/sessions`                 | Get all matches the user is part of                     |
| POST   | `/sessions`                 | Create a new match (can include guest players)          |
| GET    | `/sessions/:id`            | Get details of a specific match                          |
| PUT    | `/sessions/:id`            | Edit a match (resets confirmation if not admin)          |
| DELETE | `/sessions/:id`            | Delete a match                                           |
| POST   | `/sessions/:id/confirm`    | Confirm your participation in a match                    |



### `/friends` - Friend Routes

| Method | Route                          | Description                              |
|--------|--------------------------------|------------------------------------------|
| POST   | `/friends/send`                | Send a friend request                    |
| POST   | `/friends/respond`             | Accept or reject a request               |
| GET    | `/friends/requests`            | View your pending friend requests        |
| GET    | `/friends/list/:id`            | Get friend list of a user                |
| GET    | `/friends/mutual/:id`          | View mutual friends with a user          |
| POST   | `/friends/unfriend`            | Remove a friend                          |
| GET    | `/friends/notifications`       | Get all friend-related notifications     |
| PUT    | `/friends/notifications/:id/read` | Mark a notification as read            |


## Admin Routes

Protected by `authMiddleware` + `adminCheck`


| Method | Route                            | Description                             |
|--------|----------------------------------|-----------------------------------------|
| GET    | `/admin/users`                   | List all users                          |
| PUT    | `/admin/users/:id`               | Update any user                         |
| DELETE | `/admin/users/:id`               | Delete any user                         |
| POST   | `/admin/games`                   | Add a game as admin                     |
| PUT    | `/admin/games/:id`               | Edit any game                           |
| DELETE | `/admin/games/:id`               | Delete any game                         |
| PUT    | `/admin/sessions/:id`            | Admin edit of any session               |
| DELETE | `/admin/sessions/:id`            | Admin delete of any session             |
| GET    | `/admin/users/search`            | Search for users by name/email          |
| GET    | `/admin/stats/users`             | Admin dashboard: user counts            |
| GET    | `/admin/stats/games`             | Admin dashboard: most played games      |
| GET    | `/admin/sessions/date-range`     | Get sessions within a specific date     |



##  Seeding Strategy
`npm run seed` — Seeds the database with standard games:
- Monopoly Deal
- Catan
- Phase 10
- Skip-Bo
- Uno

No admin accounts are seeded.
If a user signs up with the email gysagsohn@hotmail.com, they will automatically be given role: "admin".

## Related Repositories
[Frontend: game-tracker-client](https://github.com/gysagsohn/game-tracker-client)

## Author
Built by Gy Sohn as part of a career change full-stack portfolio project.

### Contact
For feedback, feature suggestions, or collaboration ideas, feel free to connect via [LinkedIn](https://www.linkedin.com/in/gysohn) or raise an issue on GitHub.


### Deployment Notes (Personal Checklist)
These are reminders for myself when deploying the backend to a live server (e.g. Render, Railway, or AWS).

**ENV Configuration (Required)**
Ensure the following variables are set in your production .env:
```
MONGO_URI=your_production_mongodb_uri
JWT_SECRET=your_secure_secret
PORT=3001

GOOGLE_CLIENT_ID=your_live_google_client_id
GOOGLE_CLIENT_SECRET=your_live_google_secret

FACEBOOK_APP_ID=your_fb_app_id
FACEBOOK_APP_SECRET=your_fb_secret

EMAIL_FROM=production_email@yourdomain.com
EMAIL_APP_PASSWORD=generated_app_password_or_sendgrid_key
```
**Email Sending**

- Development: Uses Gmail + App Password via Nodemailer

**CORS Configuration**
Update cors() config to allow your frontend domain (e.g., https://gametracker.com)

**Remove Dev-Only Features**
Console logs
Test accounts
Seed script (npm run seed) if used in production
Ensure no hardcoded tokens or test emails in sendEmail.js