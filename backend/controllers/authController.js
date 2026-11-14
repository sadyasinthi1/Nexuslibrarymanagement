const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const makeToken = (user) => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '8h' });
const safeUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role });
exports.register = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Name, valid email and password (8+ characters) required' });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: 'Email is already registered' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
    return res.status(201).json({ token: makeToken(user), user: safeUser(user) });
  } catch (error) { next(error); }
};
exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || typeof req.body.password !== 'string' || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }
    return res.json({ token: makeToken(user), user: safeUser(user) });
  } catch (error) { next(error); }
};
