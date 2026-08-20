// TEMPORARY in-memory store. Data resets every time the server restarts.
// Replace this file's internals with real database calls once the team
// decides on a DB (this is flagged as an open question in the requirements
// doc) — the function signatures below are the "contract" the rest of the
// auth code relies on, so keep them the same when you swap the DB in.

let users = [];
let nextId = 1;

module.exports = {
  async findByGoogleId(googleId) {
    return users.find((u) => u.googleId === googleId) || null;
  },

  async findById(id) {
    return users.find((u) => u.id === id) || null;
  },

  async createUser({ googleId, name, email, avatarUrl }) {
    const user = {
      id: nextId++,
      googleId,
      name,
      email,
      avatarUrl,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    return user;
  },
};
