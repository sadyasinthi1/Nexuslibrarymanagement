const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Book = require('../models/Book');
const present = user => ({ id: user._id, name: user.name, email: user.email, role: user.role });
exports.me = (req, res) => res.json({ user: present(req.user) });
exports.updateMe = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'Valid name required' });
      req.user.name = name.trim();
    }
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ message: 'Password must be 8+ characters' });
      req.user.passwordHash = await bcrypt.hash(password, 10);
    }
    await req.user.save();
    res.json({ user: present(req.user) });
  } catch (error) { next(error); }
};
exports.deleteMe = async (req, res, next) => {
  try {
    await Book.deleteMany({ createdBy: req.user._id });
    await User.deleteOne({ _id: req.user._id });
    res.json({ message: 'Account and associated books deleted' });
  } catch (error) { next(error); }
};
exports.allUsers = async (req, res, next) => {
  try { res.json(await User.find().select('name email role createdAt')); }
  catch (error) { next(error); }
};
