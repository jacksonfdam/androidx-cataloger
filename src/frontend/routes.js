const express = require('express');
const {Library} = require('../db/connection');

const router = express.Router();

// Home page - List all libraries
router.get('/', async (req, res) => {
  try {
    const libraries = await Library.find({}, {
      name: 1,
      groupId: 1,
      stableRelease: 1,
      rcRelease: 1,
      betaRelease: 1,
      alphaRelease: 1
    }).sort({name: 1});

    res.render('index', {
      title: 'AndroidX Libraries',
      libraries
    });
  } catch (error) {
    console.error('Error fetching libraries for homepage:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load libraries'
    });
  }
});

// Library detail page
router.get('/library/:name', async (req, res) => {
  try {
    const library = await Library.findOne({name: req.params.name});

    if (!library) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Library not found'
      });
    }

    res.render('library_detail', {
      title: `${library.name} - AndroidX Library`,
      library
    });
  } catch (error) {
    console.error(`Error fetching library ${req.params.name}:`, error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load library details'
    });
  }
});

// Generate catalog (POST)
router.post('/catalog', async (req, res) => {
  try {
    const selectedLibraries = req.body.libraries || [];

    // If no libraries selected, redirect back to home
    if (!Array.isArray(selectedLibraries) || selectedLibraries.length === 0) {
      return res.redirect('/');
    }

    // Fetch details for selected libraries
    const libraries = await Library.find({
      name: {$in: selectedLibraries}
    });

    // Create version catalog data
    const catalogData = {
      versions: {},
      libraries: {}
    };

    // Process each library
    libraries.forEach(library => {
      const versionKey = library.name.replace(/-/g, '_');
      const selectedVersion = req.body[`version_${library.name}`] || library.stableRelease || library.rcRelease || library.betaRelease || library.alphaRelease;

      if (selectedVersion) {
        // Add to versions section
        catalogData.versions[versionKey] = selectedVersion;

        // Add main library to libraries section
        catalogData.libraries[versionKey] = {
          module: `${library.groupId}:${library.name}`,
          versionRef: versionKey
        };

        // Add dependencies to libraries section if they exist
        if (library.dependencies && library.dependencies.length > 0) {
          library.dependencies.forEach(dep => {
            if (dep && dep.name && dep.artifact) {
              const depKey = `${versionKey}_${dep.name.replace(/-/g, '_')}`;
              catalogData.libraries[depKey] = {
                module: `${dep.groupId || library.groupId}:${dep.artifact}`,
                versionRef: versionKey
              };
            }
          });
        }
      }
    });

    console.log(`Generated catalog with ${Object.keys(catalogData.versions).length} versions and ${Object.keys(catalogData.libraries).length} libraries`);

    res.render('catalog_result', {
      title: 'Generated Version Catalog',
      catalogData,
      libraries
    });
  } catch (error) {
    console.error('Error generating catalog:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to generate version catalog'
    });
  }
});

// Version Catalog Analyzer
router.get('/analyzer', (req, res) => {
  res.render('analyzer', {
    title: 'Version Catalog Analyzer'
  });
});

module.exports = router;