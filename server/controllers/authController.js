const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const users = require('../data/userStore');


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload(); // { sub, email, name, picture, ... }
}

function signSessionToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

// POST /api/auth/google
// Verifies the Google ID token from the frontend, creates the user if this
// is their first sign-in, and returns our own session JWT (not the Google
// token) for the frontend to use on subsequent requests.
exports.googleAuth = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      error: { code: 'MISSING_TOKEN', message: 'idToken is required' },
    });
  }

  let payload;
  try {
    payload = await verifyGoogleToken(idToken);
  } catch (err) {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Google token could not be verified' },
    });
  }

  try {
    let user = await users.findByGoogleId(payload.sub);

    if (!user) {
      user = await users.createUser({
        googleId: payload.sub,
        name: payload.name,
        email: payload.email,
        avatarUrl: payload.picture,
      });
    }

    const token = signSessionToken(user);
    return res.status(200).json({ user: toPublicUser(user), token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Something went wrong' },
    });
  }
};

// GET /api/auth/me
// req.user is set by the requireAuth middleware after verifying the
// session JWT (not the raw Google token — see the note sent to the
// frontend dev about why).
exports.getCurrentUser = async (req, res) => {
  const user = await users.findById(req.user.sub);

  if (!user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User not found' },
    });
  }

  return res.status(200).json({ user: toPublicUser(user) });
};
