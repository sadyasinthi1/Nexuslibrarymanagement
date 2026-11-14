const mongoose = require('mongoose');
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  author: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, default: 'General', trim: true, maxlength: 60 },
  status: { type: String, enum: ['Available', 'Borrowed'], default: 'Available' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Book', bookSchema);
