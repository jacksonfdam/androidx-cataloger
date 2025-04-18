const {Library} = require('../db/connection');
const scraper = require('../scraper');
const toml = require('toml');

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
    }).sort({name: 1});

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
    const library = await Library.findOne({name: req.params.name});

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

// Clear all libraries from database
async function clearDatabase(req, res) {
  try {
    const result = await Library.deleteMany({});

    res.json({
      success: true,
      message: 'Database cleared successfully',
      deleted: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear database',
      error: error.message
    });
  }
}

/**
 * Fix specific known problematic TOML content
 * I know, its a workaround....
 */
function fixKnownProblems(content) {
  // Replace problematic keys with quoted versions
  return content
    .replace(/ktlint-gradle-plugin/g, '"ktlint-gradle-plugin"')
    .replace(/kotlin-gradle-plugin/g, '"kotlin-gradle-plugin"')
    // Add more problematic keys as needed
    .replace(/(\w+)[.](\w+)[-](\w+)/g, '"$1.$2-$3"'); // General pattern for keys with dots and hyphens
}

/**
 * Preprocess TOML content to fix common issues
 */
function preprocessToml(content) {
  if (!content) return content;

  // Trim whitespace
  let processed = content.trim();

  // Ensure sections exist
  if (!processed.includes('[versions]')) {
    processed = '[versions]\n' + processed;
  }

  if (!processed.includes('[libraries]')) {
    processed = processed + '\n\n[libraries]\n';
  }

  // Fix common syntax errors

  // Replace single quotes with double quotes
  processed = processed.replace(/(\w+)\s*=\s*'([^']*)'/g, '$1 = "$2"');

  // Ensure spaces around equals signs
  processed = processed.replace(/(\w+)=([^=])/g, '$1 = $2');

  // Fix missing quotes around versions
  processed = processed.replace(/(\w+)\s*=\s*([0-9.]+)(?!\s*")/g, '$1 = "$2"');

  // Fix module syntax
  processed = processed.replace(/module\s*=\s*([^,\s"]+)(?!\s*")/g, 'module = "$1"');

  // Handle dots in key names by escaping them with quotes
  const lines = processed.split('\n');
  const processedLines = lines.map(line => {
    // Check if this is a key-value line (not a section header or comment)
    if (!line.trim().startsWith('[') && !line.trim().startsWith('#') && line.includes('=')) {
      // Extract the key part (before the equals sign)
      const keyMatch = line.match(/^([^=]+)=/);
      if (keyMatch) {
        const key = keyMatch[1].trim();
        // If the key contains dots and is not already quoted
        if (key.includes('.') && !key.startsWith('"') && !key.endsWith('"')) {
          // Replace the key with a quoted version
          return line.replace(key, `"${key}"`);
        }
      }
    }
    return line;
  });

  return processedLines.join('\n');
}

/**
 * Simple TOML parser for basic version catalogs
 * This is a fallback when the toml package fails
 */
function simpleTomlParser(content) {
  const result = {
    versions: {},
    libraries: {}
  };

  let currentSection = null;

  // Split by lines and process each line
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Check for section headers
    if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
      currentSection = trimmedLine.substring(1, trimmedLine.length - 1);
      continue;
    }

    // Skip if no section is active
    if (!currentSection) {
      continue;
    }

    // Process key-value pairs
    if (currentSection === 'versions') {
      // Match version declarations with various formats
      // 1. Standard format: key = "value"
      // 2. Key with dots: "key.with.dots" = "value"
      // 3. Unquoted value: key = value
      const versionMatch = trimmedLine.match(/^(?:"([^"]+)"|([a-zA-Z0-9_-]+))\s*=\s*(?:"([^"]+)"|([a-zA-Z0-9._-]+))/);

      if (versionMatch) {
        const key = versionMatch[1] || versionMatch[2]; // Either quoted or unquoted key
        const value = versionMatch[3] || versionMatch[4]; // Either quoted or unquoted value
        result.versions[key] = value;
      }
    } else if (currentSection === 'libraries') {
      // Match library declarations with various formats
      // First try to match the full line with curly braces
      const fullLineMatch = trimmedLine.match(/^(?:"([^"]+)"|([a-zA-Z0-9_-]+))\s*=\s*\{(.+)\}/);

      if (fullLineMatch) {
        const key = fullLineMatch[1] || fullLineMatch[2]; // Either quoted or unquoted key
        const details = fullLineMatch[3];

        // Extract module
        const moduleMatch = details.match(/module\s*=\s*"([^"]+)"/);

        // Extract version or version.ref
        const versionMatch = details.match(/version\s*=\s*"([^"]+)"/);
        const versionRefMatch = details.match(/version\.ref\s*=\s*"([^"]+)"/);

        if (moduleMatch) {
          result.libraries[key] = {
            module: moduleMatch[1]
          };

          if (versionMatch) {
            result.libraries[key].version = versionMatch[1];
          } else if (versionRefMatch) {
            result.libraries[key].version = {
              ref: versionRefMatch[1]
            };
          }
        }
      } else {
        // If not a full line with curly braces, try to match a simple key-value pair
        const simpleMatch = trimmedLine.match(/^(?:"([^"]+)"|([a-zA-Z0-9_-]+))\s*=\s*(?:"([^"]+)"|([a-zA-Z0-9._-]+))/);

        if (simpleMatch) {
          const key = simpleMatch[1] || simpleMatch[2]; // Either quoted or unquoted key
          const value = simpleMatch[3] || simpleMatch[4]; // Either quoted or unquoted value

          // Assume it's a direct module reference
          result.libraries[key] = {
            module: value,
            version: value.split(':')[1] // Try to extract version from module string
          };
        }
      }
    }
  }

  return result;
}

// Analyze TOML Version Catalog
async function analyzeVersionCatalog(req, res) {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'No TOML content provided'
      });
    }

    console.log('Received TOML content to analyze:', content.substring(0, 100) + '...');

    // Parse TOML content
    let parsedToml;
    try {
      // Fix known problems first
      const fixedContent = fixKnownProblems(content);

      // Then preprocess the TOML content
      const processedContent = preprocessToml(fixedContent);
      console.log('Preprocessed TOML:', processedContent.substring(0, 100) + '...');

      try {
        // Try the official TOML parser first
        parsedToml = toml.parse(processedContent);
      } catch (officialParserError) {
        console.warn('Official TOML parser failed, trying simple parser:', officialParserError.message);

        // Try our simple parser as fallback
        parsedToml = simpleTomlParser(processedContent);

        // Validate that we got some data
        if (Object.keys(parsedToml.versions || {}).length === 0 && Object.keys(parsedToml.libraries || {}).length === 0) {
          throw officialParserError; // Re-throw the original error if our parser also failed
        }

        console.log('Simple parser extracted:', {
          versions: Object.keys(parsedToml.versions || {}).length,
          libraries: Object.keys(parsedToml.libraries || {}).length
        });
      }
    } catch (error) {
      console.error('TOML parsing error:', error);

      // Extract line and column information if available
      let errorMessage = 'Invalid TOML format';
      if (error.line && error.column) {
        errorMessage += ` at line ${error.line}, column ${error.column}`;
      }

      return res.status(400).json({
        success: false,
        message: errorMessage,
        error: error.message,
        details: {
          line: error.line,
          column: error.column
        }
      });
    }

    console.log('Successfully parsed TOML. Found:', {
      versions: Object.keys(parsedToml.versions || {}).length,
      libraries: Object.keys(parsedToml.libraries || {}).length
    });

    // Extract versions and libraries
    const versions = parsedToml.versions || {};
    const libraries = parsedToml.libraries || {};

    // Prepare analysis results
    const analysisResults = [];

    // Process each library
    for (const [key, lib] of Object.entries(libraries)) {
      // Skip entries without module or version
      if (!lib.module || (!lib.version && !lib.version?.ref)) {
        continue;
      }

      // Extract module info
      const [groupId, artifactId] = lib.module.split(':');

      // Get version (either direct or referenced)
      let currentVersion;
      if (lib.version) {
        if (typeof lib.version === 'object' && lib.version.ref) {
          currentVersion = versions[lib.version.ref];
        } else {
          currentVersion = lib.version;
        }
      }

      if (!currentVersion) {
        continue;
      }

      // Find library in database
      let dbLibrary = null;

      // Try to find by artifactId
      dbLibrary = await Library.findOne({ name: artifactId });

      // If not found, try to find by dependency artifact
      if (!dbLibrary) {
        dbLibrary = await Library.findOne({
          'dependencies.artifact': artifactId
        });
      }

      // Prepare result object
      const result = {
        key,
        module: lib.module,
        currentVersion,
        latestVersions: {},
        status: 'unknown',
        libraryName: artifactId,
        groupId,
        versionRef: typeof lib.version === 'object' && lib.version.ref ? lib.version.ref : null
      };

      // If library found in database
      if (dbLibrary) {
        // Set library name
        result.libraryName = dbLibrary.name;

        // Check if it's a main library or a dependency
        if (dbLibrary.name === artifactId) {
          // Main library
          result.latestVersions = {
            stable: dbLibrary.stableRelease,
            rc: dbLibrary.rcRelease,
            beta: dbLibrary.betaRelease,
            alpha: dbLibrary.alphaRelease
          };
        } else {
          // It's a dependency, find the specific dependency
          const dependency = dbLibrary.dependencies.find(dep => dep.artifact === artifactId);

          if (dependency) {
            result.latestVersions = {
              stable: dependency.stableRelease,
              rc: dependency.rcRelease,
              beta: dependency.betaRelease,
              alpha: dependency.alphaRelease
            };
          }
        }

        // Determine status
        if (result.latestVersions.stable && result.latestVersions.stable !== currentVersion) {
          result.status = 'outdated';
          result.latestVersion = result.latestVersions.stable;
        } else if (result.latestVersions.rc && !currentVersion.includes('rc')) {
          result.status = 'rc-available';
          result.latestVersion = result.latestVersions.rc;
        } else if (result.latestVersions.beta && !currentVersion.includes('beta') && !currentVersion.includes('rc')) {
          result.status = 'beta-available';
          result.latestVersion = result.latestVersions.beta;
        } else if (result.latestVersions.alpha && !currentVersion.includes('alpha') && !currentVersion.includes('beta') && !currentVersion.includes('rc')) {
          result.status = 'alpha-available';
          result.latestVersion = result.latestVersions.alpha;
        } else {
          result.status = 'up-to-date';
        }
      }

      analysisResults.push(result);
    }

    res.json({
      success: true,
      data: {
        totalLibraries: analysisResults.length,
        outdated: analysisResults.filter(r => r.status === 'outdated').length,
        upToDate: analysisResults.filter(r => r.status === 'up-to-date').length,
        unknown: analysisResults.filter(r => r.status === 'unknown').length,
        results: analysisResults
      }
    });
  } catch (error) {
    console.error('Error analyzing version catalog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze version catalog',
      error: error.message
    });
  }
}

// Get release notes for a library
async function getLibraryReleaseNotes(req, res) {
  try {
    const {name, version} = req.params;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Library name is required'
      });
    }

    // Find library in database
    const library = await Library.findOne({name});

    if (!library) {
      return res.status(404).json({
        success: false,
        message: 'Library not found'
      });
    }

    // Get release notes from Android Developer site
    const releaseNotesUrl = `https://developer.android.com/jetpack/androidx/releases/${name}`;

    res.json({
      success: true,
      data: {
        library,
        releaseNotesUrl,
        version: version || library.stableRelease || library.rcRelease || library.betaRelease || library.alphaRelease
      }
    });
  } catch (error) {
    console.error('Error getting library release notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get library release notes',
      error: error.message
    });
  }
}

// Certifique-se de exportar todas as funções
module.exports = {
  syncLibraries,
  getAllLibraries,
  getLibraryByName,
  clearDatabase,
  analyzeVersionCatalog,
  getLibraryReleaseNotes
};