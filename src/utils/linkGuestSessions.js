const Session = require("../models/SessionModel");
const User = require("../models/UserModel");
const sendEmail = require("./sendEmail");

/**
 * Links any guest sessions matching the user's email to their account,
 * and auto-friends the creator of each matched session.
 *
 * Called from both the local signup flow and the Google OAuth callback
 * so that guest matches are claimed consistently regardless of auth path.
 *
 * Side effects:
 * - Updates Session.players entries (sets user ref, marks confirmed)
 * - Mutates and saves the user's friends array
 * - Saves affected inviter User documents
 * - Sends a "your matches have been linked" notification email
 *
 * Errors from individual auto-friend operations are caught and warned
 * rather than thrown — a partial success is better than failing the
 * whole auth flow over a non-critical step.
 *
 * @param {import('mongoose').Document} user - Mongoose User document (must have _id and email)
 * @returns {Promise<number>} Number of sessions linked (0 if none found)
 */
async function linkGuestSessions(user) {
  const sessions = await Session.find({
    "players.email": user.email,
    "players.user": null,
  });

  if (sessions.length === 0) return 0;

  const inviterIds = new Set();

  // Claim each guest player entry that matches this user's email
  for (const session of sessions) {
    session.players.forEach((player) => {
      if (player.email === user.email && !player.user) {
        player.user = user._id;
        // Guest players are auto-confirmed — no manual confirmation needed
        player.confirmed = true;
      }
    });

    if (session.createdBy) inviterIds.add(session.createdBy.toString());
    await session.save();
  }

  // Auto-friend each match creator (bidirectional, skips self and existing friends)
  for (const inviterId of inviterIds) {
    if (inviterId === user._id.toString()) continue;
    try {
      const inviter = await User.findById(inviterId);
      if (!inviter) continue;

      const alreadyFriends = user.friends?.some((f) => f.toString() === inviterId);
      if (!alreadyFriends) {
        user.friends = user.friends || [];
        user.friends.push(inviterId);

        if (!inviter.friends.some((f) => f.toString() === user._id.toString())) {
          inviter.friends.push(user._id);
        }
        await inviter.save();
      }
    } catch (friendErr) {
      console.warn("Auto-friend failed for inviter", inviterId, friendErr.message);
    }
  }

  await user.save();

  // Notify the user that their past matches are now on their account
  try {
    const result = await sendEmail(
      user.email,
      "Your Guest Matches Have Been Linked! – Keep Track",
      `
        <h2>Welcome to Keep Track, ${user.firstName}!</h2>
        <p>Good news! We found <strong>${sessions.length} match(es)</strong> where you were invited as a guest.</p>
        <p>These have now been linked to your new account.</p>
        <p>
          <a href="${process.env.FRONTEND_URL}/matches"
             style="display: inline-block; padding: 10px 20px; background: #5865F2; color: white; text-decoration: none; border-radius: 8px;">
            View Your Matches
          </a>
        </p>
      `
    );
    if (!result.ok) console.error("Failed to send guest match notification:", result.error);
  } catch (err) {
    console.error("Failed to send guest match notification:", err);
  }

  return sessions.length;
}

module.exports = linkGuestSessions;