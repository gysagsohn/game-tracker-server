const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/UserModel");
const linkGuestSessions = require("../utils/linkGuestSessions");

// Strip trailing slashes so the callback URL is always well-formed,
// regardless of how SERVER_URL is defined in the environment.
const cleanServerUrl = (url) => url?.replace(/\/+$/, "") || "";

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

        if (!user) {
          // First time signing in with Google — create the account.
          // isEmailVerified is true because Google has already verified the address.
          user = await User.create({
            firstName,
            lastName,
            email,
            authProvider: "google",
            googleId,
            isEmailVerified: true,
            profileIcon: photo || undefined,
          });
        } else {
          // Existing account — backfill Google fields if missing
          // (e.g. user originally signed up with email/password, then used Google)
          let changed = false;
          if (!user.googleId) { user.googleId = googleId; changed = true; }
          if (!user.profileIcon && photo) { user.profileIcon = photo; changed = true; }
          if (!user.authProvider) { user.authProvider = "google"; changed = true; }
          if (changed) await user.save();
        }

        // Link any guest matches to this account, auto-friend match creators,
        // and send the "your matches have been linked" email.
        // Runs for both new and returning users — it's safe to call repeatedly
        // because linkGuestSessions only processes entries where player.user is null.
        try {
          await linkGuestSessions(user);
        } catch (linkErr) {
          // Non-fatal — log but don't fail the OAuth flow
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