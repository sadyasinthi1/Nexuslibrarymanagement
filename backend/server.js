require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '25kb' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/books', require('./routes/bookRoutes'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Team Nexus Mini Library' }));
app.use(express.static(path.resolve(__dirname, '../public')));
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) return res.status(400).json({ message: 'Invalid JSON request body' });
  if (err.code === 11000) return res.status(409).json({ message: 'Duplicate record' });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});
async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) throw new Error('Set JWT_SECRET to a long secret in .env');
  await connectDB();
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Mini Library running at http://localhost:${port}`));
}
if (require.main === module) start().catch(error => { console.error('Startup failed:', error.message); process.exit(1); });
module.exports = { app, start };
