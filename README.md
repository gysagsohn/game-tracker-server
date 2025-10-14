<p align="center">
  <a href="https://github.com/gysagsohn/game-tracker-server">
    <img src="https://img.shields.io/github/stars/gysagsohn/game-tracker-server?style=social" alt="GitHub stars">
  </a>
  <a href="https://gy-gametracker.netlify.app">
    <img src="https://img.shields.io/netlify/5e8a7452-b0cc-44b7-b637-1f0c32622d1f?label=Frontend%20Deploy&logo=netlify" alt="Netlify frontend">
  </a>
  <a href="https://game-tracker-server-zq2k.onrender.com">
    <img src="https://img.shields.io/badge/Render-Backend-green?logo=render" alt="Render backend">
  </a>
  <img src="https://img.shields.io/badge/status-live-brightgreen" alt="App status">
</p>

# Game Tracker Backend – Express + MongoDB API

Production-ready backend API for [Game Tracker](https://github.com/gysagsohn/game-tracker-client), a full-stack MERN application for tracking card and board game results with friends.

**Frontend Repository:** [game-tracker-client](https://github.com/gysagsohn/game-tracker-client)

## Live Deployment
- **Backend API**: [https://game-tracker-server-zq2k.onrender.com](https://game-tracker-server-zq2k.onrender.com)
- **Frontend App**: [https://gy-gametracker.netlify.app](https://gy-gametracker.netlify.app)

---

## Features

### Core Functionality
- Track card and board game results with detailed player stats
- Log match scores including guest players (non-registered users)
- Match confirmation system with email reminders
- View comprehensive user statistics (wins/losses/favorite games)
- Friend system with requests and notifications
- Real-time notifications for match invites and friend activity
- Bookmark favorite games
- Email invitations for guest players with auto-account linking

### Authentication & Security
- JWT-based authentication with email verification
- Google OAuth integration via Passport.js
- Input sanitization to prevent XSS attacks
- Field whitelisting to prevent privilege escalation
- Rate limiting on sensitive endpoints (login, signup, password reset)
- Secure password reset with token validation and expiry
- Role-based access control (user/admin)
- Account suspension system

### Admin Tools
- User management dashboard
- Match editing and deletion
- Statistics dashboard with analytics
- User search functionality
- System-wide settings

### Data Management
- Guest match auto-linking when users sign up
- Activity logging for audit trails (capped at 100 entries)
- Database indexes for 10-100x query performance
- Email rate limiting for guest invites
- Match edit tracking with lastEditedBy field

---

## Tech Stack

**Core:**
- Node.js & Express.js
- MongoDB with Mongoose ODM
- JWT for authentication

**Security:**
- bcrypt for password hashing
- Joi for request validation
- express-rate-limit for API protection
- Custom sanitization utilities

**Email:**
- Nodemailer with Gmail integration

**Authentication:**
- Passport.js (Google OAuth)
- Custom JWT middleware

---

## Project Structure

```bash
game-tracker-server/
├── src/
│   ├── config/
│   │   ├── database.js           # MongoDB connection
│   │   ├── passport.js           # OAuth strategies
│   │   └── validateEnv.js        # Environment validation
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── userController.js     # User CRUD + stats
│   │   ├── sessionController.js  # Match management
│   │   ├── gameController.js     # Game library
│   │   ├── friendController.js   # Friend system
│   │   └── adminController.js    # Admin operations
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification
│   │   ├── adminCheck.js         # Role verification
│   │   ├── privacyGuard.js       # Resource ownership
│   │   ├── matchPrivacyGuard.js  # Match access control
│   │   ├── rateLimiter.js        # Rate limiting
│   │   └── validateRequest.js    # Joi validation
│   ├── models/
│   │   ├── UserModel.js
│   │   ├── SessionModel.js
│   │   ├── GameModel.js
│   │   └── NotificationModel.js
│   ├── routes/
│   │   ├── authRouter.js
│   │   ├── userRouter.js
│   │   ├── sessionRouter.js
│   │   ├── gameRouter.js
│   │   ├── friendRouter.js
│   │   └── adminRouter.js
│   ├── utils/
│   │   ├── sanitize.js           # XSS prevention
│   │   ├── sendEmail.js          # Email service
│   │   └── logActivity.js        # Activity logging
│   ├── validation/
│   │   ├── authSchemas.js        # Auth validation rules
│   │   ├── sessionSchemas.js     # Match validation
│   │   └── gameSchemas.js        # Game validation
│   ├── scripts/
│   │   ├── seed.js               # Database seeding
│   │   ├── reset.js              # Database reset
│   │   ├── createAdmin.js        # Admin account creation
│   │   └── checkIndexes.js       # Index verification
│   ├── index.js                  # Server entry point
│   └── server.js                 # Express app config
├── .env
├── .gitignore
├── package.json
└── README.md
```


## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Gmail account (for email features)
- Google OAuth credentials (optional)

### Installation

1. **Clone the repository**
```bash
git clone git@github.com:gysagsohn/game-tracker-server.git
cd game-tracker-server
```

2. **Install dependencies**
```bash
npm install
```

3. **Create `.env` file**
```env
# Database
DATABASE_URL=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_secure_random_string

# Server
PORT=3001
SERVER_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email
EMAIL_FROM=your_gmail@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password
```

4. **Seed the database** (optional)
```bash
npm run seed
```

5. **Create admin account**
```bash
npm run create-admin
```

6. **Start development server**
```bash
npm run dev
```

Server will start at `http://localhost:3001`

---

## Security Features

### Input Validation & Sanitization
- **Joi validation** on all request bodies
- **HTML sanitization** to prevent XSS attacks
- **Field whitelisting** to prevent mass assignment
- **Unknown field stripping** for security

### Authentication Security
- **Password hashing** with bcrypt (10 salt rounds)
- **JWT tokens** with 7-day expiry
- **Email verification** required for login
- **Token validation** with database checks
- **Token expiry enforcement** (15 min for password reset)
- **Token reuse prevention** (one-time use tokens)

### API Protection
- **Rate limiting:**
  - 5 requests/10min on auth endpoints
  - 5 friend requests/hour per user
  - 3 guest invites/day per email
  - 1 match reminder/6 hours
- **CORS** configured for frontend domain
- **Privacy guards** ensure users only access their own data
- **Role-based access control** for admin routes

### Performance Optimizations
- **Database indexes** on frequently queried fields
- **Activity log capping** (100 entries per user)
- **Query optimization** with compound indexes
- **10-100x faster** queries vs unindexed

---

## Data Models

### User
- Personal info (name, email, profile icon)
- Authentication data (password hash, OAuth IDs)
- Friend connections and requests
- Game statistics (wins/losses/most played)
- Favorite games bookmarks
- Activity logs (last 100 actions)
- Account status (verified, suspended, role)

### Session (Match)
- Game reference
- Players array (registered + guests)
- Individual scores and results
- Confirmation status per player
- Match notes and date
- Creator and last editor tracking
- Reminder timestamps

### Game
- Name, description, category
- Player count (min/max)
- Custom games flag
- Creator reference

### Notification
- Recipient and sender references
- Notification type (friend request, match invite, etc.)
- Message content
- Read status and timestamps
- Optional session reference

---

## API Endpoints

### Authentication (`/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Create account |
| POST | `/login` | Login user |
| GET | `/google` | Google OAuth |
| GET | `/verify-email` | Verify email token |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password |
| POST | `/resend-verification-email` | Resend verification |

### Users (`/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get logged-in user |
| GET | `/:id` | Get user by ID |
| PUT | `/:id` | Update user (firstName, lastName, profileIcon only) |
| DELETE | `/:id` | Delete account |
| GET | `/:id/stats` | Get user statistics |
| GET | `/search?q=query` | Search users |

### Sessions/Matches (`/sessions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user's matches |
| POST | `/` | Create match |
| GET | `/:id` | Get match details |
| PUT | `/:id` | Update match |
| DELETE | `/:id` | Delete match |
| POST | `/:id/confirm` | Confirm participation |
| POST | `/:id/decline` | Decline match |
| POST | `/:id/remind` | Send reminder emails |
| GET | `/my-pending` | Get unconfirmed matches |

### Games (`/games`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all games |
| POST | `/` | Create game |
| GET | `/:id` | Get game details |
| PUT | `/:id` | Update game |
| DELETE | `/:id` | Delete game |
| POST | `/:id/like` | Toggle favorite |

### Friends (`/friends`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/send` | Send friend request |
| POST | `/respond` | Accept/reject request |
| GET | `/requests` | Get pending requests |
| GET | `/sent` | Get sent requests |
| GET | `/list/:id` | Get friend list |
| POST | `/unfriend` | Remove friend |
| GET | `/notifications` | Get notifications |
| PUT | `/notifications/:id/read` | Mark as read |
| POST | `/notifications/read-all` | Mark all as read |

### Admin (`/admin`)
All routes require admin role. See full list in code documentation.

---

## Testing

### Manual Testing
Use Bruno, Postman, or curl to test endpoints:
```bash
# Example: Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Example: Get user stats
curl -X GET http://localhost:3001/users/:id/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Database Indexes
```bash
node src/scripts/checkIndexes.js
```

---

## 📝 Scripts
```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm run seed         # Seed database with default games
npm run reset        # Clear all database collections
npm run create-admin # Create admin account interactively
```

---

## Deployment

### Environment Variables (Production)
Ensure all required variables are set in your hosting platform:
- DATABASE_URL
- JWT_SECRET  
- GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET
- EMAIL_FROM & EMAIL_APP_PASSWORD
- FRONTEND_URL (for CORS)
- SERVER_URL (for OAuth callbacks)

### Deployment Checklist
- Environment variables configured
- MongoDB Atlas or production database ready
- Admin account created
- Database seeded with default games
- CORS configured for production frontend URL
- Email credentials tested
- OAuth callbacks updated to production URLs

---

## Author

**Gy Sohn**  
Full-stack developer  
[LinkedIn](https://www.linkedin.com/in/gysohn) | [GitHub](https://github.com/gysagsohn)  | [Portfolio website](https://gysohn.com)

Built as a portfolio project demonstrating:
- Production-grade security practices
- Scalable API architecture
- Modern authentication patterns
- Database optimization techniques
- Clean code organization

---

## License

This project is open source and available for educational purposes.

---

## Contributing

This is a portfolio project, but feedback and suggestions are welcome! Feel free to:
- Open an issue for bugs or suggestions
- Submit pull requests for improvements
- Star the repo if you find it useful

---

## Contact

For questions, collaboration, or feedback:
- LinkedIn: [linkedin.com/in/gysohn](https://www.linkedin.com/in/gysohn)
- Email: gysagsohn@hotmail.com

---

**Last Updated:** October 15, 2025
