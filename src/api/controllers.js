const { Library } = require('../db/connection');
const scraper = require('../scraper');

// Sync all libraries
async function syncLibraries(req, res) {
  try {
    const results = await scraper.syncAllLibraries();
    res.json({
      success: true,
      message: 'Libraries synced successfully',
      results
    });
  } catch (error) {
    console.error('Error syncing libraries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync libraries',
      error: error.message
    });
  }
}

// Get all libraries
async function getAllLibraries(req, res) {
  try {
    const libraries = await Library.find({}, {
      name: 1,
      groupId: 1,
      lastUpdate: 1,
      stableRelease: 1,
      rcRelease: 1,
      betaRelease: 1,
      alphaRelease: 1
    }).sort({ name: 1 });

    res.json({
      success: true,
      count: libraries.length,
      data: libraries
    });
  } catch (error) {
    console.error('Error fetching libraries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch libraries',
      error: error.message
    });
  }
}

// Get library by name
async function getLibraryByName(req, res) {
  try {
    const library = await Library.findOne({ name: req.params.name });

    if (!library) {
      return res.status(404).json({
        success: false,
        message: 'Library not found'
      });
    }

    res.json({
      success: true,
      data: library
    });
  } catch (error) {
    console.error(`Error fetching library ${req.params.name}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch library',
      error: error.message
    });
  }
}

module.exports = {
  syncLibraries,
  getAllLibraries,
  getLibraryByName
};