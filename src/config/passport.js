const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/UserModel");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
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
          let changed = false;
          if (!user.googleId) { user.googleId = googleId; changed = true; }
          if (!user.profileIcon && photo) { user.profileIcon = photo; changed = true; }
          if (!user.authProvider) { user.authProvider = "google"; changed = true; }
          if (changed) await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;