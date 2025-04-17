/**
 * Parse library details from the library page
 */
function parseLibraryPage($, libraryName) {
  console.log(`Parsing details for library: ${libraryName}`);

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

  // Extract Group ID - try different selectors
  try {
    // Look for Group ID in various table formats
    const groupIdSelectors = [
      'table:contains("Group") tr:contains("Group") td:last-child',
      'table tr th:contains("Group")+td',
      '.devsite-table-wrapper table tr td:contains("androidx")',
      'table.artifact-table tr td:first-child'
    ];

    for (const selector of groupIdSelectors) {
      const groupIdText = $(selector).first().text().trim();
      if (groupIdText && groupIdText.includes('androidx')) {
        library.groupId = groupIdText;
        console.log(`Found Group ID: ${groupIdText}`);
        break;
      }
    }
  } catch (error) {
    console.error(`Error extracting Group ID for ${libraryName}:`, error);
  }

  // Extract dependencies - try different selectors
  try {
    const dependencySelectors = [
      'h2:contains("Artifacts"), h3:contains("Artifacts")',
      'h2:contains("Dependencies"), h3:contains("Dependencies")',
      'h2:contains("Artifact"), h3:contains("Artifact")'
    ];

    for (const selector of dependencySelectors) {
      const dependencySection = $(selector);

      if (dependencySection.length > 0) {
        console.log(`Found dependency section using selector: ${selector}`);

        // Look for lists after the heading
        const dependencyItems = dependencySection.nextUntil('h2, h3').find('li');

        if (dependencyItems.length > 0) {
          dependencyItems.each((i, element) => {
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

                console.log(`Added dependency: ${groupId}:${artifact}`);
              }
            }
          });
        } else {
          // Try to find dependencies in tables
          const tables = dependencySection.nextUntil('h2, h3').find('table');
          if (tables.length > 0) {
            tables.find('tr').each((i, row) => {
              const cells = $(row).find('td');
              if (cells.length >= 2) {
                const groupId = $(cells[0]).text().trim();
                const artifact = $(cells[1]).text().trim();
                if (groupId && artifact) {
                  const name = artifact.split('.').pop();

                  library.dependencies.push({
                    name,
                    artifact,
                    groupId
                  });

                  console.log(`Added dependency from table: ${groupId}:${artifact}`);
                }
              }
            });
          }
        }

        // If we found dependencies, break out of the selector loop
        if (library.dependencies.length > 0) {
          break;
        }
      }
    }

    // If no dependencies found, add the main artifact as a dependency
    if (library.dependencies.length === 0) {
      library.dependencies.push({
        name: libraryName,
        artifact: libraryName,
        groupId: library.groupId
      });
      console.log(`No dependencies found, added main artifact: ${library.groupId}:${libraryName}`);
    }
  } catch (error) {
    console.error(`Error extracting dependencies for ${libraryName}:`, error);
  }

  // Log summary
  console.log(`Parsing complete for ${libraryName}:`);
  console.log(`- Group ID: ${library.groupId}`);
  console.log(`- Dependencies found: ${library.dependencies.length}`);

  return library;
}

module.exports = {
  parseLibraryPage
};