const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/UserModel");
const sendVerificationEmail = require("../controllers/authController").sendVerificationEmail;

// Set up Google strategy
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL}/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract useful info from Google profile
      const email = profile.emails[0].value;
      const firstName = profile.name.givenName;
      const lastName = profile.name.familyName;

      let user = await User.findOne({ email });

      // If user doesn't exist, create one
      if (!user) {
        user = new User({
          firstName,
          lastName,
          email,
          authProvider: "google",
          isEmailVerified: true 
        });

        await user.save();
        await sendVerificationEmail(user);
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Serialize/deserialize not needed with JWT
