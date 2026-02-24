const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/UserModel");
const Session = require("../models/SessionModel");

const cleanServerUrl = (url) => url?.replace(/\/+$/, '') || '';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${cleanServerUrl(process.env.SERVER_URL)}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile?.emails?.[0]?.value?.toLowerCase?.() || null;
        if (!email) return done(new Error("Google account has no email"), null);

        const firstName = profile?.name?.givenName || "";
        const lastName = profile?.name?.familyName || "";
        const googleId = profile?.id;
        const photo = profile?.photos?.[0]?.value;

        let user = await User.findOne({ email });
        let isNewUser = false;

        if (!user) {
          user = await User.create({
            firstName,
            lastName,
            email,
            authProvider: "google",
            googleId,
            isEmailVerified: true,
            profileIcon: photo || undefined,
          });
          isNewUser = true;
        } else {
          let changed = false;
          if (!user.googleId) { user.googleId = googleId; changed = true; }
          if (!user.profileIcon && photo) { user.profileIcon = photo; changed = true; }
          if (!user.authProvider) { user.authProvider = "google"; changed = true; }
          if (changed) await user.save();
        }

        // Link any guest matches to this account (runs for new AND existing users)
        try {
          const guestSessions = await Session.find({
            'players.email': email,
            'players.user': null
          });

          if (guestSessions.length > 0) {
            const inviterIds = new Set();

            for (const session of guestSessions) {
              session.players.forEach((player) => {
                if (player.email === email && !player.user) {
                  player.user = user._id;
                  player.confirmed = true;
                }
              });

              // Collect createdBy IDs so we can auto-friend them
              if (session.createdBy) {
                inviterIds.add(session.createdBy.toString());
              }

              await session.save();
            }

            console.log(`Synced ${guestSessions.length} guest session(s) to ${email} via Google OAuth`);

            // Auto-friend: add the match creators as friends (Issue 2)
            for (const inviterId of inviterIds) {
              if (inviterId === user._id.toString()) continue;

              const inviter = await User.findById(inviterId);
              if (!inviter) continue;

              const alreadyFriends = user.friends.some(f => f.toString() === inviterId);
              if (!alreadyFriends) {
                user.friends.push(inviterId);
                inviter.friends.push(user._id);
                await inviter.save();
                console.log(`Auto-friended ${email} with inviter ${inviter.email}`);
              }
            }

            await user.save();
          }
        } catch (linkErr) {
          console.error("Guest linking error during Google OAuth:", linkErr.message);
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;