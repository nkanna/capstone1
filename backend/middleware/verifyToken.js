const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { createVerifyToken } = require('../services/authenticated-user');

module.exports = createVerifyToken({ jwt, User, secret: () => process.env.JWT_SECRET });
