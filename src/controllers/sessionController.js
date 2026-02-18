const Session = require("../models/SessionModel");
const sendEmail = require("../utils/sendEmail");
const rateLimitCache = {};
const logUserActivity = require("../utils/logActivity");
const User = require("../models/UserModel");
const Notification = require("../models/NotificationModel");
const NotificationTypes = require("../constants/notificationTypes");
const { sanitizeArray, sanitizeString } = require("../utils/sanitize");
const { FRONTEND_URL } = require("../utils/urls");
const renderEmail = require("../utils/renderEmail");
const { EMAIL } = require("../constants/limits")

// GET /sessions
async function getAllSessions(req, res, next) {
  try {
    const sessions = await Session.find({ "players.user": req.user._id })
      .populate("game")
      .populate("players.user", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");
    res.json({ message: "Fetched your sessions", data: sessions });
  } catch (err) {
    next(err);
  }
}

// POST /sessions
  async function createSession(req, res, next) {
    try {
      const { game, players, notes, date } = req.body;

      // Sanitize session-level fields
      const sanitizedNotes = typeof notes === "string" ? sanitizeString(notes) : notes;

      // Sanitize player array (names and emails)
      const sanitizedPlayers = sanitizeArray(players || [], ["name", "email"]);

      let allConfirmed = true;
      let guestEmailsSent = 0;

      for (const player of sanitizedPlayers) {
        if (!player.user) {
          // Guest players are auto-confirmed
          player.confirmed = true;

          if (player.invited && player.email) {
            const key = `${player.email}_${new Date().toDateString()}`;
            const sentToday = rateLimitCache[key] || 0;

            if (sentToday < EMAIL.GUEST_INVITES_PER_EMAIL_PER_DAY) {
              const ok = await sendGuestInviteEmail(player.email, player.name);
              if (ok) guestEmailsSent += 1;
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
        players: sanitizedPlayers,
        notes: sanitizedNotes,
        matchStatus,
        createdBy: req.user._id,
        date: date || Date.now()
      });

      await session.save();

      // POPULATE to get game name and creator name
      await session.populate("game");
      await session.populate("createdBy", "firstName lastName");

      // Notify registered players (excluding creator)
      try {
        const creatorId = req.user._id.toString();
        
        //  Get names for notifications
        const creatorName = session.createdBy
          ? `${session.createdBy.firstName} ${session.createdBy.lastName}`.trim()
          : "Someone";
        const gameName = session.game?.name || "a game";
        
        // Filter for registered players (excluding creator)
        const registered = (sanitizedPlayers || []).filter(
          p => p.user && p.user.toString() !== creatorId
        );

        if (registered.length) {
          // Create personalized notifications
          await Notification.insertMany(
            registered.map(p => {
              //  Find player's result from the sanitizedPlayers array
              const playerResult = p.result 
                ? `${p.result} result` 
                : "result";
              
              return {
                recipient: p.user,
                sender: req.user._id,
                type: NotificationTypes.MATCH_INVITE,
                message: `${creatorName} added you to a ${gameName} match. Please confirm your ${playerResult}.`,
                session: session._id
              };
            })
          );
        }
      } catch (e) {
        console.warn("Failed to emit MATCH_INVITE notifications:", e.message);
      }

      res.status(201).json({ message: "Match created", data: session, guestEmailsSent });
    } catch (err) {
      next(err);
    }
  }


// Helper
async function sendGuestInviteEmail(email, name = "Player") {
  const html = `
    <h3>You've been invited to a game on Game Tracker!</h3>
    <p>Hi ${name},</p>
    <p>You were added to a match as a guest. To track your own stats and matches, create an account below:</p>
    <a href="${FRONTEND_URL}/signup">Sign up and claim your games</a>
  `;
  const wrapped = renderEmail({
    title: "You’re invited to a game!",
    preheader: "Create an account to claim your matches and stats",
    bodyHtml: `
      <p>Hi ${name},</p>
      <p>You were added to a match as a guest. Create an account to track your stats and claim games.</p>
      <p><a class="button" href="${FRONTEND_URL}/signup">Sign up & claim your games</a></p>
    `
  });
  const { ok } = await sendEmail(email, "Game Tracker Invite – Claim Your Games", wrapped);
  return ok;
}

// GET /sessions/:id
async function getSessionById(req, res, next) {
  try {

    const session = await Session.findById(req.params.id)
      .populate("game")
      .populate("players.user", "firstName lastName email")
      .populate("lastEditedBy", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

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

    const { game, players, notes, date } = req.body;

    // Sanitize if provided
    const sanitizedNotes = notes !== undefined && typeof notes === "string"
      ? sanitizeString(notes)
      : notes;

    const sanitizedPlayers = players !== undefined
      ? sanitizeArray(players, ["name", "email"])
      : undefined;

    if (game !== undefined) session.game = game;
    if (sanitizedNotes !== undefined) session.notes = sanitizedNotes;
    if (date !== undefined) session.date = date;

    if (sanitizedPlayers !== undefined) {
      session.players = sanitizedPlayers.map(p => ({
        ...p,
        confirmed: !p.user || false // Only guests auto-confirmed
      }));

      // Recalculate matchStatus
      const anyUnconfirmed = session.players.some(p => p.user && !p.confirmed);
      session.matchStatus = anyUnconfirmed ? "Pending" : "Confirmed";
    }

    session.lastEditedBy = req.user._id;

    await session.save();

    await session
      .populate("game")
      .populate("players.user", "firstName lastName email")
      .populate("lastEditedBy", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

    await logUserActivity(req.user._id, "Updated Match", { sessionId: session._id });

    // Notify other registered players about the update
    try {
      const updaterId = req.user._id.toString();
      const recipients = session.players
        .filter(p => p.user && p.user._id && p.user._id.toString() !== updaterId)
        .map(p => p.user._id);
      if (recipients.length) {
        await Notification.insertMany(
          recipients.map(uid => ({
            recipient: uid,
            sender: req.user._id,
            type: NotificationTypes.MATCH_UPDATED,
            message: `Match was updated.`,
            session: session._id
          }))
        );
      }
    } catch (e) {
      console.warn("Failed to emit MATCH_UPDATED notifications:", e.message);
    }

    res.json({ message: "Session updated", data: session });
  } catch (err) {
    next(err);
  }
}

// DELETE /sessions/:id
async function deleteSession(req, res, next) {
  try {
    await Session.findByIdAndDelete(req.params.id);
    res.status(204).end(); // proper empty 204
  } catch (err) {
    next(err);
  }
}

// POST /sessions/:id/confirm
async function confirmSession(req, res, next) {
  try {
    const session = await Session.findById(req.params.id)
      .populate("game")
      .populate("createdBy", "firstName lastName");
    
    if (!session) return res.status(404).json({ message: "Match not found." });

    const userId = req.user._id.toString();
    let found = false;
    let myResult = "";

    session.players.forEach(player => {
      if (player.user && player.user.toString() === userId) {
        player.confirmed = true;
        player.confirmedAt = new Date();
        myResult = player.result || "their result";
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

    try {
      if (session.createdBy && session.createdBy._id.toString() !== userId) {
        // Get confirming user's name
        const confirmingUser = await User.findById(userId).select("firstName lastName");
        const confirmerName = confirmingUser 
          ? `${confirmingUser.firstName} ${confirmingUser.lastName}`.trim()
          : "A player";
        
        const gameName = session.game?.name || "the match";
        
        await Notification.create({
          recipient: session.createdBy._id,
          sender: req.user._id,
          type: NotificationTypes.MATCH_CONFIRMED,
          message: `${confirmerName} confirmed their ${myResult} result for ${gameName}.`,
          session: session._id
        });
      }
    } catch (e) {
      console.warn("Failed to emit MATCH_CONFIRMED notification:", e.message);
    }

    res.json({ message: "Match confirmed", data: { matchStatus: session.matchStatus } });
  } catch (err) {
    next(err);
  }
}

// POST /sessions/:id/decline
async function declineSession(req, res, next) {
  try {
    const session = await Session.findById(req.params.id)
      .populate("createdBy", "firstName lastName email")
      .populate("players.user", "firstName lastName email");
    
    if (!session) {
      return res.status(404).json({ message: "Match not found." });
    }

    const userId = req.user._id.toString();
    
    // Find player index
    const playerIndex = session.players.findIndex(
      p => p.user && p.user._id.toString() === userId
    );
    
    if (playerIndex === -1) {
      return res.status(403).json({ message: "You are not a registered player in this match." });
    }

    // Get declining user info for notification
    const decliningUser = await User.findById(userId).select("firstName lastName");
    const declinerName = decliningUser 
      ? `${decliningUser.firstName} ${decliningUser.lastName}`.trim()
      : "A player";

    // Remove the player from the match
    session.players.splice(playerIndex, 1);
    
    // If no registered players left (only guests or empty), delete the match
    const hasRegisteredPlayers = session.players.some(p => p.user);
    
    if (!hasRegisteredPlayers) {
      await Session.findByIdAndDelete(req.params.id);
      
      await logUserActivity(
        req.user._id, 
        "Declined Match (Match Deleted - No Players)", 
        { sessionId: session._id }
      );
      
      return res.json({ 
        message: "Match declined and deleted (no registered players remaining).",
        matchDeleted: true
      });
    }

    // Otherwise, save the updated session
    await session.save();

    // Recalculate match status after player removal
    const anyUnconfirmed = session.players.some(p => p.user && !p.confirmed);
    session.matchStatus = anyUnconfirmed ? "Pending" : "Confirmed";
    await session.save();

    await logUserActivity(req.user._id, "Declined Match", { sessionId: session._id });

    // Notify creator that the user declined
    try {
      if (session.createdBy && session.createdBy._id.toString() !== userId) {
        await Notification.create({
          recipient: session.createdBy._id || session.createdBy,
          sender: req.user._id,
          type: NotificationTypes.MATCH_DECLINED,
          message: `${declinerName} declined the match invitation.`,
          session: session._id  
        });
      }
    } catch (e) {
      console.warn("Failed to emit MATCH_DECLINED notification:", e.message);
    }

    return res.json({ 
      message: "You have declined this match.",
      data: session 
    });
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

    const REMINDER_COOLDOWN = EMAIL.MATCH_REMINDER_COOLDOWN_MS;
    const now = Date.now();

    if (session.lastReminderSent && now - session.lastReminderSent.getTime() < REMINDER_COOLDOWN) {
      return res.status(429).json({ message: "Reminder already sent recently. Try again later." });
    }

    const unconfirmed = session.players.filter(
      p => p.user && !p.confirmed && p.user.email
    );

    if (unconfirmed.length === 0) {
      return res.status(400).json({ message: "No unconfirmed users to remind." });
    }

    let reminderEmailsSent = 0;

    for (const player of unconfirmed) {
      const email = player.user.email;
      const name = player.user.firstName || player.user.name;
      const confirmLink = `${FRONTEND_URL}/matches/${session._id}`;
      const html = renderEmail({
        title: "Reminder: confirm your match",
        preheader: "Please review and confirm your game result",
        bodyHtml: `
          <p>Hi ${name},</p>
          <p>You’ve been added to a game but haven’t confirmed your result yet.</p>
          <p><a class="button" href="${confirmLink}">Review & confirm</a></p>
          <p class="muted">Direct link:<br/><span style="word-break:break-all">${confirmLink}</span></p>
        `
      });
      const { ok } = await sendEmail(email, "Reminder – Confirm Your Game Result", html);
      if (ok) reminderEmailsSent += 1;
    }

    // Emit in-app reminders too
    try {
      await Notification.insertMany(
        unconfirmed.map(p => ({
          recipient: p.user._id,
          sender: req.user._id,
          type: NotificationTypes.MATCH_REMINDER,
          message: `Reminder to confirm your match.`,
          session: session._id
        }))
      );
    } catch (e) {
      console.warn("Failed to emit MATCH_REMINDER notifications:", e.message);
    }

    session.lastReminderSent = new Date();
    await session.save();

    await logUserActivity(req.user._id, "Sent Match Confirmation Reminder", {
      sessionId: session._id,
      remindedCount: unconfirmed.length
    });

    res.json({
      message: "Reminder emails processed",
      data: { count: unconfirmed.length },
      reminderEmailsSent
    });
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
  declineSession,
  remindMatchConfirmation,
  getMyPendingSessions
};


