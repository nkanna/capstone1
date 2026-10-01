function createVerifyToken({ jwt, User, secret }) {
  return async function verifyToken(req, res, next) {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !/^Bearer \S+$/i.test(header)) return res.status(401).json({ err: 'Invalid token.' });
    let decoded;
    try {
      decoded = jwt.verify(header.split(' ')[1], secret(), { algorithms: ['HS256'] });
      if (typeof decoded?.user?._id !== 'string' || !/^[a-f\d]{24}$/i.test(decoded.user._id)) throw new Error('Invalid user');
    } catch { return res.status(401).json({ err: 'Invalid token.' }); }
    try {
      // A signed JWT must no longer grant write access after account deletion.
      const user = await User.findById(decoded.user._id);
      if (!user) return res.status(401).json({ err: 'Invalid token.' });
      req.user = { _id: String(user._id), email: user.email };
      next();
    } catch { res.status(503).json({ message: 'We couldn’t verify your account. Please try again.' }); }
  };
}
module.exports = { createVerifyToken };
