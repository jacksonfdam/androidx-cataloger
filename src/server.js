const express = require('express');
const nunjucks = require('nunjucks');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('./db/connection');

// Import routes
const apiRoutes = require('./api/routes');
const frontendRoutes = require('./frontend/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Nunjucks
nunjucks.configure(path.join(__dirname, 'templates'), {
  autoescape: true,
  express: app,
  noCache: process.env.NODE_ENV === 'development'
});

app.set('view engine', 'njk');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', apiRoutes);
app.use('/', frontendRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});