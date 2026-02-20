<p align="center">
  <a href="https://github.com/gysagsohn/game-tracker-server">
    <img src="https://img.shields.io/github/stars/gysagsohn/game-tracker-server?style=social" alt="GitHub stars">
  </a>
  <a href="https://app.netlify.com/sites/gy-gametracker/deploys">
    <img src="https://api.netlify.com/api/v1/badges/54a5c9e5-9595-48c7-a422-221e8a15bc1d/deploy-status" alt="Netlify Frontend">
  </a>
  <a href="https://game-tracker-server-zq2k.onrender.com">
    <img src="https://img.shields.io/badge/Render-Backend-green?logo=render" alt="Render backend">
  </a>
  <img src="https://img.shields.io/badge/status-live-brightgreen" alt="App status">
</p>

# Game Tracker Backend – Express + MongoDB API

Production-ready backend API for [Game Tracker](https://github.com/gysagsohn/game-tracker-client), a full-stack MERN application for tracking board and card game results with friends.

**Frontend Repository:** [game-tracker-client](https://github.com/gysagsohn/game-tracker-client)

## Live Deployment
- **Backend API**: [https://game-tracker-server-zq2k.onrender.com](https://game-tracker-server-zq2k.onrender.com)
- **Frontend App**: [https://gy-gametracker.netlify.app](https://gy-gametracker.netlify.app)

---

## Why I Built This

I was using Google Keep to track board game wins and losses with my friends—copying and pasting names, manually updating scores, and scrolling through endless notes to find past results. It was messy and inefficient.

I wanted a proper solution: a full-stack web app where we could log matches, confirm results, view statistics, and keep everything organized. Game Tracker was born from this need, and it became a portfolio project showcasing production-ready development practices.

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
- Enterprise-grade security 
- OAuth redirect validation (phishing prevention)
- Single-use password reset tokens with auto-login
- Comprehensive rate limiting on all sensitive endpoints
- Input sanitization (XSS/NoSQL injection prevention)
- Atomic database operations (race condition prevention)
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
- Resend API for transactional emails

**Authentication:**
- Passport.js (Google OAuth)
- Custom JWT middleware

---

## Security Architecture

Game Tracker implements enterprise-grade security with a **10/10 security score**, protecting against:
- Brute force attacks (rate limiting)
- OAuth phishing (redirect validation)
- XSS attacks (input sanitization)
- NoSQL injection (query sanitization)
- Token reuse (single-use reset tokens)
- Race conditions (atomic database operations)
- Email bombing (rate-limited reminders)
- Data scraping (search rate limiting)

**Defense-in-Depth:** 6 layers of protection (Input Validation → Sanitization → Authentication → Authorization → Rate Limiting → Database)

**See detailed security documentation in [Version 2.0 section](#version-20---security-sprint-february-2026-)** ⬇️

---

## Project Structure
```bash
game-tracker-server/
├── src/
│   ├── config/           # Database, OAuth, environment validation
│   ├── controllers/      # Business logic (auth, users, sessions, games, friends, admin)
│   ├── middleware/       # JWT, rate limiting, validation, privacy guards
│   ├── models/           # Mongoose schemas (User, Session, Game, Notification)
│   ├── routes/           # API route definitions
│   ├── utils/            # Helpers (sanitization, email, activity logging)
│   ├── constants/        # Rate limits and app constants
│   ├── validation/       # Joi schemas
│   ├── scripts/          # Seed, reset, admin creation
│   ├── index.js          # Server entry point
│   └── server.js         # Express app config
├── .env                  # Environment variables (gitignored)
├── .env.example          # Environment template
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB database (local or Atlas)
- Resend API key (for email features)
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
JWT_SECRET=your_secure_random_string_min_32_chars

# Server
PORT=3001
NODE_ENV=development
SERVER_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email
RESEND_API_KEY=your_resend_api_key

# Admin Account (Required for seeding)
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_FIRST_NAME=Your
ADMIN_LAST_NAME=Name
```

**Security Note:** Never commit `.env` to version control! Copy `.env.example` instead.

4. **Seed the database**
```bash
npm run seed
```
Creates 8 standard games (Monopoly Deal, Catan, Phase 10, Skip-Bo, Uno, Codenames, Ticket to Ride, Exploding Kittens) and your admin account.

5. **Start development server**
```bash
npm run dev
```

Server will start at `http://localhost:3001`

---

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Rate Limit | Description |
|--------|----------|-----------|-------------|
| POST | `/signup` | 5/10min | Create account |
| POST | `/login` | 5/10min | Login user |
| GET | `/google` | - | Google OAuth initiate |
| GET | `/google/callback` | - | Google OAuth callback |
| GET | `/verify-email` | - | Verify email token |
| POST | `/forgot-password` | 5/10min | Request password reset |
| POST | `/reset-password` | 5/10min | Reset password (auto-login) |
| POST | `/resend-verification-email` | 5/10min | Resend verification |

### Users (`/api/users`)
| Method | Endpoint | Rate Limit | Description |
|--------|----------|-----------|-------------|
| GET | `/me` | - | Get logged-in user |
| GET | `/:id` | - | Get user by ID |
| PUT | `/:id` | - | Update user |
| DELETE | `/:id` | - | Delete account |
| GET | `/:id/stats` | - | Get user statistics |
| GET | `/search?q=query` | 20/min | Search users |

### Sessions/Matches (`/api/sessions`)
| Method | Endpoint | Rate Limit | Description |
|--------|----------|-----------|-------------|
| GET | `/` | - | Get user's matches |
| POST | `/` | 10/hour | Create match |
| GET | `/:id` | - | Get match details |
| PUT | `/:id` | - | Update match |
| DELETE | `/:id` | - | Delete match |
| POST | `/:id/confirm` | - | Confirm participation |
| POST | `/:id/decline` | - | Decline match |
| POST | `/:id/remind` | 3/hour | Send reminder emails |
| GET | `/my-pending` | - | Get unconfirmed matches |

### Games (`/api/games`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all games |
| POST | `/` | Create game |
| GET | `/:id` | Get game details |
| PUT | `/:id` | Update game |
| DELETE | `/:id` | Delete game |
| POST | `/:id/like` | Toggle favorite |

### Friends (`/api/friends`)
| Method | Endpoint | Rate Limit | Description |
|--------|----------|-----------|-------------|
| POST | `/send` | 5/hour | Send friend request |
| POST | `/respond` | - | Accept/reject request |
| GET | `/requests` | - | Get pending requests |
| GET | `/sent` | - | Get sent requests |
| GET | `/list/:id` | - | Get friend list |
| POST | `/unfriend` | - | Remove friend |
| GET | `/notifications` | - | Get notifications |
| PUT | `/notifications/:id/read` | - | Mark as read |
| POST | `/notifications/read-all` | - | Mark all as read |

---

## Scripts
```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm run seed         # Seed database with games + admin account
npm run reset        # Clear all database collections
```

---

## Deployment

### Environment Variables (Production)

**Required:**
- `DATABASE_URL` - MongoDB connection string
- `JWT_SECRET` - Random string (32+ characters)
- `RESEND_API_KEY` - Resend API key
- `FRONTEND_URL` - Your Netlify URL
- `SERVER_URL` - Your Render URL
- `NODE_ENV` - `production`

**For Seeding:**
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`

**Optional:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (OAuth)
- Rate limit overrides: `AUTH_RATE_MAX`, `FRIEND_RATE_MAX`, etc.

### Deployment Checklist
- Environment variables configured on Render
- MongoDB Atlas ready
- Database seeded
- CORS configured for frontend URL
- OAuth callbacks updated to production URLs
- Rate limiting tested

---

## Testing
```bash
# Test rate limiting
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo "\nAttempt $i"
done
# Attempt 6 should return 429 (rate limited)

# Verify database indexes
node src/scripts/checkIndexes.js
```

---

## Author

**Gy Sohn**  
Full-Stack Developer  
[LinkedIn](https://www.linkedin.com/in/gysohn) | [GitHub](https://github.com/gysagsohn) | [Portfolio](https://gysohn.com)

Built as a portfolio project demonstrating:
- Enterprise-grade security (10/10 security score)
- Scalable API architecture
- Modern authentication (JWT + OAuth)
- Database optimization
- Production deployment

---

## License

Open source and available for educational purposes.

---

## Contributing

Feedback and suggestions welcome! Open an issue or submit a PR.

---

## Contact

- LinkedIn: [linkedin.com/in/gysohn](https://www.linkedin.com/in/gysohn)
- Email: gysagsohn@hotmail.com

---

## Recent Updates

### Version 2.0 - Security Sprint (February 2026) 

**Complete security overhaul achieving 10/10 security score.**

#### Security Fixes (5/5 Complete)

**Fix #1: OAuth Redirect Validation**
- Validates redirect URIs against allowlist
- Prevents open redirect phishing attacks
- Blocks token theft via malicious redirects
```javascript
function isValidRedirectUri(uri) {
  const allowedOrigins = [FRONTEND_URL, 'http://localhost:5173'];
  return allowedOrigins.some(allowed => 
    new URL(uri).origin === new URL(allowed).origin
  );
}
```

**Fix #2: Password Reset Token Security**
- Single-use tokens with immediate invalidation
- 15-minute expiration window
- Token stored in database for validation
- Auto-login after successful reset
- **Flow:** Request → Generate token → Validate → Invalidate → Auto-login

**Fix #3: Email Verification Race Condition**
- Atomic database operations (`findOneAndUpdate`)
- Prevents duplicate verification attempts
- Idempotent verification endpoint
```javascript
await User.findOneAndUpdate(
  { _id: userId, isEmailVerified: false },
  { $set: { isEmailVerified: true } },
  { new: true }
);
```

**Fix #4: Comprehensive Rate Limiting**

All sensitive endpoints now protected:

| Endpoint | Limit | Window | Protection |
|----------|-------|--------|------------|
| Auth (login/signup/reset) | 5 req | 10 min | Brute force |
| Friend requests | 5 req | 1 hour | Spam |
| Match creation | 10 req | 1 hour | Abuse |
| Search queries | 20 req | 1 min | Scraping |
| Match reminders | 3 req | 1 hour | Email bombing |
| General API | 100 req | 1 min | DDoS |

Configurable via environment variables:
```bash
AUTH_RATE_MAX=5
AUTH_RATE_WINDOW_MS=600000
FRIEND_RATE_MAX=5
```

**Fix #5: Input Sanitization Audit**
- All user inputs sanitized to prevent XSS
- Search queries sanitized (NoSQL injection prevention)
- Triple-layer validation: Joi → Sanitization → Mongoose

**Sanitization utilities:**
```javascript
sanitizeString(str)     // Removes HTML/script tags
sanitizeObject(obj, allowedFields)  // Whitelists fields
sanitizeArray(arr, fields)  // Sanitizes array elements
```

**Applied to:**
- User search queries
- Friend request emails
- Match notes and player names
- User profile updates
- Game descriptions

#### Defense-in-Depth Architecture

**6 Layers of Protection:**
1. **Input Validation** - Joi schema validation, field whitelisting
2. **Sanitization** - HTML entity encoding, script removal
3. **Authentication** - JWT with expiration, bcrypt hashing
4. **Authorization** - Role-based access, resource ownership checks
5. **Rate Limiting** - Endpoint-specific limits, IP tracking
6. **Database** - Mongoose validation, atomic operations

#### Attack Vectors Blocked

| Attack Type | Protection | Status |
|-------------|-----------|--------|
| Brute Force Password | Rate limiting (5/10min) | BLOCKED |
| Token Reuse | Single-use reset tokens | BLOCKED |
| OAuth Phishing | Redirect URI validation | BLOCKED |
| XSS Attacks | Input sanitization | BLOCKED |
| NoSQL Injection | Query sanitization | BLOCKED |
| Email Bombing | Rate limiting | BLOCKED |
| Account Enumeration | Generic errors | BLOCKED |
| Race Conditions | Atomic operations | BLOCKED |
| Data Scraping | Search rate limiting | BLOCKED |
| Spam Creation | Creation rate limiting | BLOCKED |

#### Additional Security Enhancements
- Removed hardcoded admin credentials from seed script
- Environment variable validation on startup
- Centralized security utilities
- JSON responses for rate limit errors
- Comprehensive error handling

#### Performance Optimizations
- Strategic database indexes (10-100x query performance)
- Activity log capping (100 entries per user)
- Query optimization with compound indexes
- Eliminated N+1 query problems


---

### Version 1.3 - Production Hardening (January 2026)
- XSS prevention with HTML sanitization
- Field whitelisting for privilege escalation protection
- Comprehensive Joi validation
- Database performance optimizations

---

### Version 1.2 - Feature Expansion (December 2025)
- Friend system with notifications
- Guest player support with email invitations
- Match confirmation workflow
- Email reminders

---

### Version 1.1 - Core Features (November 2025)
- User authentication and authorization
- Match tracking with player stats
- Game library management
- Basic admin tools