/**
 * Parse library details from the library page
 */
function parseLibraryPage($, libraryName) {
  // Initialize library object
  const library = {
    name: libraryName,
    groupId: 'androidx.' + libraryName.split('-')[0], // Default groupId pattern
    lastUpdate: null,
    stableRelease: null,
    rcRelease: null,
    betaRelease: null,
    alphaRelease: null,
    versions: [],
    dependencies: []
  };

  // Extract Group ID (this selector needs to be adjusted based on actual page structure)
  const groupIdText = $('table:contains("Group") tr:contains("Group") td:last-child').text().trim();
  if (groupIdText) {
    library.groupId = groupIdText;
  }

  // Extract versions
  $('table.versions-table tbody tr').each((i, element) => {
    const version = $(element).find('td:nth-child(1)').text().trim();
    const dateText = $(element).find('td:nth-child(2)').text().trim();
    const releaseDate = dateText ? new Date(dateText) : null;

    // Determine release type
    let releaseType = 'Stable';
    if (version.includes('alpha')) {
      releaseType = 'Alpha';
      if (!library.alphaRelease) library.alphaRelease = version;
    } else if (version.includes('beta')) {
      releaseType = 'Beta';
      if (!library.betaRelease) library.betaRelease = version;
    } else if (version.includes('rc')) {
      releaseType = 'RC';
      if (!library.rcRelease) library.rcRelease = version;
    } else {
      if (!library.stableRelease) library.stableRelease = version;
    }

    library.versions.push({
      version,
      releaseDate,
      releaseType
    });
  });

  // Sort versions by date (newest first)
  library.versions.sort((a, b) => {
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return b.releaseDate - a.releaseDate;
  });

  // Set last update from the newest version
  if (library.versions.length > 0 && library.versions[0].releaseDate) {
    library.lastUpdate = library.versions[0].releaseDate;
  }

  // Extract dependencies
  $('h2:contains("Artifacts"), h3:contains("Artifacts")').nextUntil('h2, h3').find('li').each((i, element) => {
    const artifactText = $(element).text().trim();
    if (artifactText) {
      const parts = artifactText.split(':');
      if (parts.length >= 2) {
        const groupId = parts[0];
        const artifact = parts[1];
        const name = artifact.split('.').pop();

        library.dependencies.push({
          name,
          artifact,
          groupId
        });
      }
    }
  });

  return library;
}

module.exports = {
  parseLibraryPage
};