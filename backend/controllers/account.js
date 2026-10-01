const User = require('../models/user');
const Recipe = require('../models/recipe');
const jwt = require('jsonwebtoken');
const { createAccountHandlers } = require('../services/account');

module.exports = createAccountHandlers({
  User, Recipe,
  signToken: user => jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: '24h', algorithm: 'HS256' }),
});
