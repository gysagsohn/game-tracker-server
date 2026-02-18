const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const { FRONTEND_URL } = require("../utils/urls");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function isValidRedirectUri(uri) {
  if (!uri) return false;
  
  try {
    const url = new URL(uri);
    const allowedOrigins = [
      FRONTEND_URL,
      'http://localhost:5173', 
      'http://localhost:3000', 
    ].filter(Boolean); // Remove empty values
    
    // Check if the origin matches any allowed origin
    return allowedOrigins.some(allowed => {
      try {
        const allowedUrl = new URL(allowed);
        return url.origin === allowedUrl.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

async function googleCallback(req, res, next) {
  try {
    const { code, state } = req.query;
    
    // VALIDATE REDIRECT URI
    const redirectUri = state || FRONTEND_URL;
    if (!isValidRedirectUri(redirectUri)) {
      console.warn('Invalid redirect URI attempted:', redirectUri);
      return res.redirect(`${FRONTEND_URL}/login?error=invalid_redirect`);
    }

    if (!code) {
      return res.redirect(`${redirectUri}/login?error=no_code`);
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.SERVER_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    });

    const { access_token, id_token } = tokenResponse.data;

    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, email_verified } = payload;

    if (!email_verified) {
      return res.redirect(`${redirectUri}/login?error=email_not_verified`);
    }

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      user = new User({
        email: email.toLowerCase().trim(),
        firstName: given_name || '',
        lastName: family_name || '',
        authProvider: 'google',
        isEmailVerified: true,
        role: 'user',
      });
      await user.save();
    } else if (user.authProvider !== 'google') {
      // Link Google to existing local account
      user.authProvider = 'google';
      user.isEmailVerified = true;
      await user.save();
    }

    // Create JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // USE VALIDATED REDIRECT URI
    res.redirect(`${redirectUri}/oauth/success#token=${token}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    // SAFE FALLBACK
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
}

module.exports = { googleCallback, isValidRedirectUri };