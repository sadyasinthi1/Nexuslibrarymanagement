const mongoose = require('mongoose');
const Book = require('../models/Book');
function filterFor(req, id) {
  const filter = { _id: id };
  if (req.user.role !== 'admin') filter.createdBy = req.user._id;
  return filter;
}
function validId(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid book ID' });
    return false;
  }
  return true;
}
exports.list = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    res.json(await Book.find(filter).sort({ createdAt: -1 }));
  } catch (error) { next(error); }
};
exports.getOne = async (req, res, next) => {
  try {
    if (!validId(req, res)) return;
    const book = await Book.findOne(filterFor(req, req.params.id));
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (error) { next(error); }
};
exports.create = async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const author = String(req.body.author || '').trim();
    const category = req.body.category === undefined ? 'General' : req.body.category;
    const status = req.body.status || 'Available';
    if (!title || !author || typeof category !== 'string' || !['Available','Borrowed'].includes(status)) {
      return res.status(400).json({ message: 'Title, author and valid status required' });
    }
    const book = await Book.create({ title, author, category, status, createdBy: req.user._id });
    res.status(201).json(book);
  } catch (error) { next(error); }
};
exports.update = async (req, res, next) => {
  try {
    if (!validId(req, res)) return;
    const changes = {};
    for (const field of ['title','author','category','status']) {
      if (req.body[field] !== undefined) changes[field] = req.body[field];
    }
    if ((changes.title !== undefined && (typeof changes.title !== 'string' || !changes.title.trim())) ||
        (changes.author !== undefined && (typeof changes.author !== 'string' || !changes.author.trim())) ||
        (changes.category !== undefined && typeof changes.category !== 'string') ||
        (changes.status !== undefined && !['Available','Borrowed'].includes(changes.status))) {
      return res.status(400).json({ message: 'Invalid book details' });
    }
    const book = await Book.findOneAndUpdate(filterFor(req, req.params.id), changes, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (error) { next(error); }
};
exports.remove = async (req, res, next) => {
  try {
    if (!validId(req, res)) return;
    const book = await Book.findOneAndDelete(filterFor(req, req.params.id));
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json({ message: 'Book deleted' });
  } catch (error) { next(error); }
};
