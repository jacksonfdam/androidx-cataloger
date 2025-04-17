const axios = require('axios');
const cheerio = require('cheerio');
const { Library } = require('../db/connection');
const parser = require('./parser');

// Base URLs
const BASE_URL = 'https://developer.android.com';
const LIBRARIES_URL = `${BASE_URL}/jetpack/androidx/versions`;

/**
 * Scrape the main AndroidX libraries page
 */
async function scrapeLibrariesList() {
  try {
    const response = await axios.get(LIBRARIES_URL);
    const $ = cheerio.load(response.data);

    // Extract library names from the table
    const libraries = [];

    // This selector might need adjustment based on the actual page structure
    $('table tbody tr').each((i, element) => {
      const libraryName = $(element).find('td:first-child').text().trim();
      if (libraryName) {
        libraries.push(libraryName);
      }
    });

    console.log(`Found ${libraries.length} libraries`);
    return libraries;
  } catch (error) {
    console.error('Error scraping libraries list:', error);
    throw error;
  }
}

/**
 * Scrape details for a specific library
 */
async function scrapeLibraryDetails(libraryName) {
  try {
    const libraryUrl = `${BASE_URL}/jetpack/androidx/releases/${libraryName}`;
    const response = await axios.get(libraryUrl);
    const $ = cheerio.load(response.data);

    // Parse library details using the parser module
    const libraryDetails = parser.parseLibraryPage($, libraryName);

    // Add Maven URL
    libraryDetails.mavenUrl = `https://mvnrepository.com/artifact/${libraryDetails.groupId}/${libraryName}`;

    return libraryDetails;
  } catch (error) {
    console.error(`Error scraping details for ${libraryName}:`, error);
    // Return basic info if page doesn't exist or other error
    return {
      name: libraryName,
      error: error.message
    };
  }
}

/**
 * Sync all libraries data
 */
async function syncAllLibraries() {
  try {
    // Get list of all libraries
    const libraries = await scrapeLibrariesList();
    const results = {
      total: libraries.length,
      updated: 0,
      failed: 0,
      skipped: 0
    };

    // Process each library
    for (const libraryName of libraries) {
      try {
        // Get library details
        const libraryDetails = await scrapeLibraryDetails(libraryName);

        if (libraryDetails.error) {
          console.log(`Skipping ${libraryName}: ${libraryDetails.error}`);
          results.skipped++;
          continue;
        }

        // Update or insert library in database
        await Library.findOneAndUpdate(
          { name: libraryName },
          libraryDetails,
          { upsert: true, new: true }
        );

        console.log(`Updated ${libraryName}`);
        results.updated++;
      } catch (error) {
        console.error(`Failed to process ${libraryName}:`, error);
        results.failed++;
      }
    }

    return results;
  } catch (error) {
    console.error('Error in syncAllLibraries:', error);
    throw error;
  }
}

module.exports = {
  scrapeLibrariesList,
  scrapeLibraryDetails,
  syncAllLibraries
};