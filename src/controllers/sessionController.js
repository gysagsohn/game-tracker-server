const Session = require("../models/SessionModel");
const sendEmail = require("../utils/sendEmail");
const rateLimitCache = {};
const logUserActivity = require("../utils/logActivity");
const User = require("../models/UserModel");

// GET /sessions
async function getAllSessions(req, res, next) {
  try {
    const sessions = await Session.find({ "players.user": req.user._id }).populate("game players.user");
    res.json({ message: "Fetched your sessions", data: sessions });
  } catch (err) {
    next(err);
  }
}

  // POST /sessions
  async function createSession(req, res, next) {
    try {
      const { game, players, notes, date } = req.body;
      if (!game || !players || players.length === 0) {
        return res.status(400).json({ message: "Game and players are required." });
      }

      let allConfirmed = true;

      for (const player of players) {
        if (!player.user) {
          // Guest players are auto-confirmed
          player.confirmed = true;

          if (player.invited && player.email) {
            const key = `${player.email}_${new Date().toDateString()}`;
            const sentToday = rateLimitCache[key] || 0;

            if (sentToday < 3) {
              await sendGuestInviteEmail(player.email, player.name);
              rateLimitCache[key] = sentToday + 1;
            } else {
              console.log(`Invite limit reached for ${player.email}`);
            }
          }

        } else if (player.user.toString() === req.user._id.toString()) {
          // Match creator → auto-confirm yourself
          player.confirmed = true;
        } else {
          // Other registered players must confirm manually
          player.confirmed = false;
          allConfirmed = false;
        }
      }

      const matchStatus = allConfirmed ? "Confirmed" : "Pending";

      const session = new Session({
        game,
        players,
        notes,
        matchStatus,
        createdBy: req.user._id,
        date: date || Date.now()
      });

      await session.save();
      res.status(201).json({ message: "Match created", data: session });
    } catch (err) {
      next(err);
    }
  }
// Helper
async function sendGuestInviteEmail(email, name = "Player") {
  const html = `
    <h3>You’ve been invited to a game on Game Tracker!</h3>
    <p>Hi ${name},</p>
    <p>You were added to a match as a guest. To track your own stats and matches, create an account below:</p>
    <a href="https://gy-gametracker.netlify.app/signup">Sign up and claim your games</a>
  `;
  await sendEmail(email, "Game Tracker Invite – Claim Your Games", html);
}

// GET /sessions/:id
async function getSessionById(req, res, next) {
  try {
    const session = await Session.findById(req.params.id).populate("game players.user");
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json({ message: "Fetched session", data: session });
  } catch (err) {
    next(err);
  }
}

// PUT /sessions/:id
async function updateSession(req, res, next) {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found." });

    const { game, players, notes, date, matchStatus } = req.body;
    if (game !== undefined) session.game = game;
    if (players !== undefined) session.players = players;
    if (notes !== undefined) session.notes = notes;
    if (date !== undefined) session.date = date;
    if (matchStatus !== undefined) session.matchStatus = matchStatus;

    session.lastEditedBy = req.user._id;

    await session.save();
    await logUserActivity(req.user._id, "Updated Match", { sessionId: session._id });

    res.json({ message: "Session updated", data: session });
  } catch (err) {
    next(err);
  }
}

// DELETE /sessions/:id
async function deleteSession(req, res, next) {
  try {
    await Session.findByIdAndDelete(req.params.id);
    res.status(204).json({ message: "Session deleted", data: null });
  } catch (err) {
    next(err);
  }
}

// PATCH /sessions/:id/confirm
async function confirmSession(req, res, next) {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: "Match not found." });

    const userId = req.user._id.toString();
    let found = false;

    session.players.forEach(player => {
      if (player.user && player.user.toString() === userId) {
        player.confirmed = true;
        player.confirmedAt = new Date();
        found = true;
      }
    });

    if (!found) {
      return res.status(403).json({ message: "You are not a registered player in this match." });
    }

    const anyUnconfirmed = session.players.some(p => p.user && !p.confirmed);
    session.matchStatus = anyUnconfirmed ? "Pending" : "Confirmed";

    await session.save();
    await logUserActivity(req.user._id, "Confirmed Match", { sessionId: session._id });

    res.json({ message: "Match confirmed", data: { matchStatus: session.matchStatus } });
  } catch (err) {
    next(err);
  }
}

// POST /sessions/:id/remind
async function remindMatchConfirmation(req, res, next) {
  try {
    const session = await Session.findById(req.params.id).populate("players.user");
    if (!session) return res.status(404).json({ message: "Match not found" });
    if (session.matchStatus === "Confirmed") {
      return res.status(400).json({ message: "This match is already confirmed." });
    }

    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const now = Date.now();

    if (session.lastReminderSent && now - session.lastReminderSent.getTime() < SIX_HOURS) {
      return res.status(429).json({ message: "Reminder already sent recently. Try again later." });
    }

    const unconfirmed = session.players.filter(
      p => p.user && !p.confirmed && p.user.email
    );

    if (unconfirmed.length === 0) {
      return res.status(400).json({ message: "No unconfirmed users to remind." });
    }

    for (const player of unconfirmed) {
      const email = player.user.email;
      const name = player.user.firstName || player.user.name;

      const html = `
        <p>Hi ${name},</p>
        <p>You’ve been added to a game on Game Tracker but haven’t confirmed your result yet.</p>
        <a href="https://gy-gametracker.netlify.app/matches/${session._id}">Click here to review and confirm</a>.
      `;

      await sendEmail(email, "Reminder – Confirm Your Game Result", html);
    }

    session.lastReminderSent = new Date();
    await session.save();

    await logUserActivity(req.user._id, "Sent Match Confirmation Reminder", {
      sessionId: session._id,
      remindedCount: unconfirmed.length
    });

    res.json({ message: "Reminder emails sent", data: { count: unconfirmed.length } });
  } catch (err) {
    next(err);
  }
}

// GET /sessions/pending
async function getMyPendingSessions(req, res, next) {
  try {
    const sessions = await Session.find({
      "players.user": req.user.id,
      "players.confirmed": false
    }).populate("game players.user");

    res.json({ message: "Fetched pending matches", data: sessions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
  createSession,
  confirmSession,
  remindMatchConfirmation,
  getMyPendingSessions
};
