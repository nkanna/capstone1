// Dependency injection keeps account behavior testable without a live database.
function createAccountHandlers({ User, Recipe, signToken }) {
  const view = user => ({ _id: String(user._id), email: user.email });
  async function currentUser(req, res) {
    const user = await User.findById(req.user._id);
    if (!user) res.status(401).json({ message: 'Your session has expired. Please log in again.' });
    return user;
  }
  function matches(user, password) {
    return new Promise((resolve, reject) => user.comparePassword(password, (error, match) => error ? reject(error) : resolve(match)));
  }
  async function authorizePassword(req, res, user) {
    const password = req.body?.currentPassword;
    if (typeof password !== 'string' || !password || password.length > 1024) {
      res.status(400).json({ message: 'Enter your current password.' }); return false;
    }
    if (!await matches(user, password)) {
      res.status(403).json({ message: 'Your current password is incorrect. Please try again.' }); return false;
    }
    return true;
  }
  return {
    async get(req, res) {
      try {
        const user = await currentUser(req, res);
        if (user) res.json(view(user));
      } catch { res.status(503).json({ message: 'We couldn’t load your account. Please try again.' }); }
    },
    async update(req, res) {
      try {
        const user = await currentUser(req, res);
        if (!user || !await authorizePassword(req, res, user)) return;
        const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ message: 'Please enter a valid email address.' });
        }
        const password = req.body?.newPassword;
        if (password !== undefined && (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72)) {
          return res.status(400).json({ message: 'Use a new password with at least 8 characters and no more than 72 bytes.' });
        }
        // Ignore user IDs, owner IDs and all fields outside this allowlist.
        user.email = email;
        if (password !== undefined) user.password = password;
        await user.save(); // Runs the existing User model's bcrypt pre-save hook.
        res.json({ user: view(user), token: signToken(view(user)) });
      } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
        res.status(503).json({ message: 'We couldn’t save your account. Please try again.' });
      }
    },
    async remove(req, res) {
      try {
        const user = await currentUser(req, res);
        if (!user || !await authorizePassword(req, res, user)) return;
        // Standalone MongoDB does not support cross-document transactions.
        // Remove recipes first: if cleanup fails, the account remains so the
        // authenticated owner can retry. Never claim success before both finish.
        await Recipe.deleteMany({ ownerId: user._id });
        await User.deleteOne({ _id: user._id });
        res.json({ message: 'Your account and recipes were deleted.' });
      } catch {
        res.status(503).json({ message: 'Account deletion could not finish. Some recipes may have been removed. Please try again.' });
      }
    },
  };
}
module.exports = { createAccountHandlers };
