const Session = require("../models/SessionModel");
const sendEmail = require("../utils/sendEmail");
const rateLimitCache = {};
const logUserActivity = require("../utils/logActivity");
const User = require("../models/UserModel");

async function getAllSessions(req, res, next) {
	try {
		const sessions = await Session.find().populate("game playedBy scores.player");
		res.json(sessions);
	} catch (err) {
		next(err);
	}
}

async function createSession(req, res, next) {
  try {
    const { game, players, notes, date } = req.body;

    if (!game || !players || players.length === 0) {
      return res.status(400).json({ message: "Game and players are required." });
    }

    // Track if all registered players confirmed
    let allConfirmed = true;

    for (const player of players) {
      // Guests: auto-confirm
      if (!player.user) {
        player.confirmed = true;

        // Invite logic
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
      } else {
        // Registered users must manually confirm
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
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
}

// Email sender for guest player invites
async function sendGuestInviteEmail(email, name = "Player") {
  const html = `
    <h3>You’ve been invited to a game on Game Tracker!</h3>
    <p>Hi ${name},</p>
    <p>You were added to a match as a guest. To track your own stats and matches, create an account below:</p>
    <a href="https://your-frontend.com/signup">Sign up and claim your games</a>
  `;

  await sendEmail(email, "Game Tracker Invite – Claim Your Games", html);
}


async function getSessionById(req, res, next) {
	try {
		const session = await Session.findById(req.params.id).populate("game playedBy scores.player");
		if (!session) return res.status(404).json({ message: "Session not found" });
		res.json(session);
	} catch (err) {
		next(err);
	}
}

async function updateSession(req, res, next) {
	try {
		const updated = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
		res.json(updated);
	} catch (err) {
		next(err);
	}
}

async function deleteSession(req, res, next) {
	try {
		await Session.findByIdAndDelete(req.params.id);
		res.status(204).end();
	} catch (err) {
		next(err);
	}
}

async function confirmSession(req, res, next) {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: "Match not found." });

    const userId = req.user._id.toString();
    let found = false;

    // Update confirmed status and timestamp
    session.players.forEach(player => {
      if (player.user && player.user.toString() === userId) {
        player.confirmed = true;
        player.confirmedAt = new Date(); // ✅ New timestamp field
        found = true;
      }
    });

    if (!found) {
      return res.status(403).json({ message: "You are not a registered player in this match." });
    }

    // Check if all registered users are confirmed
    const anyUnconfirmed = session.players.some(
      p => p.user && p.confirmed === false
    );

    session.matchStatus = anyUnconfirmed ? "Pending" : "Confirmed";

    await session.save();

    await logUserActivity(req.user._id, "Confirmed Match", { sessionId: session._id });

    res.json({ message: "Match confirmed", matchStatus: session.matchStatus });
  } catch (err) {
    next(err);
  }
}

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

    // Get unconfirmed registered players
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
        <a href="https://your-frontend.com/matches/${session._id}">Click here to review and confirm</a>.
      `;

      await sendEmail(email, "Reminder – Confirm Your Game Result", html);
    }

    session.lastReminderSent = new Date();
    await session.save();

    await logUserActivity(req.user._id, "Sent Match Confirmation Reminder", {
      sessionId: session._id,
      remindedCount: unconfirmed.length
    });

    res.json({ message: "Reminder emails sent.", count: unconfirmed.length });
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
};
