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
const isDevelopment = process.env.NODE_ENV === 'development';

// Configure Nunjucks with custom filters
const env = nunjucks.configure(path.join(__dirname, 'templates'), {
  autoescape: true,
  express: app,
  noCache: isDevelopment // Disable cache in development
});

// Add date filter
env.addFilter('date', function(date, format) {
  if (!date) return '';

  const d = new Date(date);

  if (isNaN(d.getTime())) return '';

  if (format === 'YYYY-MM-DD') {
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  return d.toLocaleDateString();
});

app.set('view engine', 'njk');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Development middleware
if (isDevelopment) {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

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
  console.log(`Server running in ${isDevelopment ? 'development' : 'production'} mode on port ${PORT}`);
  if (isDevelopment) {
    console.log('Hot reloading enabled - server will restart on file changes');
  }
});