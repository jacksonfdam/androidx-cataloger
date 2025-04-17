const express = require('express');
const controllers = require('./controllers');

const router = express.Router();

// API routes
router.get('/sync', controllers.syncLibraries);
router.get('/libraries', controllers.getAllLibraries);
router.get('/library/:name', controllers.getLibraryByName);

module.exports = router;