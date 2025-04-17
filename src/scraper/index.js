const axios = require('axios');
const cheerio = require('cheerio');
const {Library} = require('../db/connection');
const parser = require('./parser');

// Base URLs
const BASE_URL = 'https://developer.android.com';
const LIBRARIES_URL = `${BASE_URL}/jetpack/androidx/versions`;
const MAVEN_BASE_URL = 'https://mvnrepository.com/artifact';

// Sleep function to avoid rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrape the main AndroidX libraries page
 */
async function scrapeLibrariesList() {
  try {
    const response = await axios.get(LIBRARIES_URL);
    const $ = cheerio.load(response.data);

    // Extract library names from the table
    const libraries = [];
    const librariesWithDetails = [];

    // This selector might need adjustment based on the actual page structure
    $('table tbody tr').each((i, element) => {
      const libraryCell = $(element).find('td:first-child');
      let libraryName = libraryCell.text().trim();

      // Check if library has (*) which indicates it has detailed artifacts
      const hasDetails = libraryName.includes('(*)');

      // Remove (*) from the name
      libraryName = libraryName.replace(/\s*\(\*\)\s*/, '');

      if (libraryName) {
        libraries.push(libraryName);

        if (hasDetails) {
          librariesWithDetails.push(libraryName);
        }
      }
    });

    console.log(`Found ${libraries.length} libraries (${librariesWithDetails.length} with detailed artifacts)`);

    return {
      libraries,
      librariesWithDetails
    };
  } catch (error) {
    console.error('Error scraping libraries list:', error);
    throw error;
  }
}

/**
 * Scrape artifacts from a library's detail page
 */
async function scrapeLibraryArtifacts(libraryName) {
  try {
    const libraryUrl = `${BASE_URL}/jetpack/androidx/releases/${libraryName}`;
    console.log(`Scraping artifacts from: ${libraryUrl}`);

    const response = await axios.get(libraryUrl);
    const $ = cheerio.load(response.data);

    const artifacts = [];

    // Find the artifacts table
    $('table:contains("Artifact") tbody tr').each((i, row) => {
      const columns = $(row).find('td');

      if (columns.length >= 5) {
        const artifactName = $(columns[0]).text().trim();
        const stableRelease = $(columns[1]).text().trim().replace('-', '');
        const rcRelease = $(columns[2]).text().trim().replace('-', '');
        const betaRelease = $(columns[3]).text().trim().replace('-', '');
        const alphaRelease = $(columns[4]).text().trim().replace('-', '');

        if (artifactName && artifactName !== 'Artifact') {
          artifacts.push({
            name: artifactName,
            stableRelease: stableRelease || null,
            rcRelease: rcRelease || null,
            betaRelease: betaRelease || null,
            alphaRelease: alphaRelease || null,
            // Assume o mesmo groupId da biblioteca principal
            groupId: `androidx.${libraryName}`
          });

          console.log(`Found artifact: ${artifactName}`);
        }
      }
    });

    return artifacts;
  } catch (error) {
    console.error(`Error scraping artifacts for ${libraryName}:`, error);
    return [];
  }
}

/**
 * Scrape versions from Maven Repository
 */
async function scrapeMavenVersions(groupId, artifactId) {
  try {
    const mavenUrl = `${MAVEN_BASE_URL}/${groupId}/${artifactId}`;
    console.log(`Scraping Maven versions from: ${mavenUrl}`);

    // Headers extraídos do cURL para contornar verificações de segurança
    const headers = {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'max-age=0',
      'dnt': '1',
      'priority': 'u=0, i',
      'sec-ch-ua': '"Chromium";v="135", "Not-A.Brand";v="8"',
      'sec-ch-ua-arch': '"arm"',
      'sec-ch-ua-bitness': '"64"',
      'sec-ch-ua-full-version': '"135.0.7049.96"',
      'sec-ch-ua-full-version-list': '"Chromium";v="135.0.7049.96", "Not-A.Brand";v="8.0.0.0"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '""',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-platform-version': '"15.4.0"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
    };

    // Cookies extraídos do cURL
    // Nota: Estes cookies são temporários e podem expirar. Você pode precisar atualizá-los periodicamente.
    const cookieHeader = '_ga=GA1.1.1568263260.1744026794; _sharedID=d374164b-73bb-45c0-9b7d-c005a942f16b; _sharedID_cst=zix7LPQsHA%3D%3D; hb_insticator_uid=aea5f1a2-ae43-4bbb-8676-6d803af2c5d4; __eoi=ID=9cbe77c8ba3a03d1:T=1744026794:RT=1744063548:S=AA-AfjYztIsRvO-P960rkRbdz3Qr; cto_bundle=MdqFT19RN2l4MThDUGRTUyUyRjFyZGtnJTJCRmZ4NWhmVEV4dE4xaTBJTm9OR081aWYxUWwlMkY5R1NUNDBvMnhnaDduSDcwS1RWMWslMkZIbGVVM20lMkJOM3prcmtZM0VaOWhkMHltNSUyQkNBY081JTJCZ2VpeWZJbTBGdjdVa1piUkhRWCUyRkl6YU9Zek5zVTI; _ga_3WZHLSR928=GS1.1.1744074118.4.0.1744074120.0.0.0; cf_clearance=Qqh1l2jtRKNJImD833R6QVGqlyUt4dcHSkD2UxdjtzM-1744927486-1.2.1.1-AqoTt3g1qMD7Uh.3oPBvBupzgZ6.2wvQDP9vMs0V.YaPBm1FcG2SJaVLwQdccMf1WdkIjvJfOxpf3OT_awgumy_tEKou7HtB7CioxnFHYdx3GUhHCz9o8PW3CZUgr2MgOUJwwPl.zjoTUY.Nm2UC_50bt5T7qyUus.SKlMkmjrFiEqYeJDOUVQoed1MmdVDBjG5NhOS.wg7krh40nVcH7YFRraSpX4t6SRT52sViYYuPSz61ymEK7ZbegLlfn5mf6dxL70QsA0yzcXr8i_OcZhwnQrr0y59GTXwTqo5YCYuFlDpvj0p8vTG8G3TY4rLQ6eUtRsjq5B17iGXnU7pWAGXcaW2RpeqIOa9R4k8Ky40; AWSALB=A4SqZZwFl/yID58x+T9MU8AebwfVVuCVGPWO4b3Mj2C69741+pz/i+6ygWkRl2LbZDpDT0Fegt/+VkBFjDHNNiGjhx0cRWc+pRGm3mxplMlXvGjK6z5GPwdMMlVG; AWSALBCORS=A4SqZZwFl/yID58x+T9MU8AebwfVVuCVGPWO4b3Mj2C69741+pz/i+6ygWkRl2LbZDpDT0Fegt/+VkBFjDHNNiGjhx0cRWc+pRGm3mxplMlXvGjK6z5GPwdMMlVG; MVN_SESSION=eyJhbGciOiJIUzI1NiJ9.eyJkYXRhIjp7InVpZCI6IjgxNjJjZjEwLTExMzUtMTFlZi1iMThjLTJkNGFkYTg2MjA2YSJ9LCJleHAiOjE3NzY0NjM1NDIsIm5iZiI6MTc0NDkyNzU0MiwiaWF0IjoxNzQ0OTI3NTQyfQ.04VLlQ4Vd-5h2uRLmp4MaPoWz4lGOjPIhO9g9Ikn-vk';

    headers['cookie'] = cookieHeader;

    const response = await axios.get(mavenUrl, { headers });
    const $ = cheerio.load(response.data);

    const versions = [];

    // Extract versions from the Maven Repository page
    $('.version-section').each((i, section) => {
      // Get the version section title (e.g., "1.10.x")
      const sectionTitle = $(section).find('h2').text().trim();
      console.log(`Found version section: ${sectionTitle}`);

      // Get all version rows in this section
      $(section).find('table.grid tbody tr').each((j, row) => {
        const versionElement = $(row).find('td:nth-child(1) a');
        const version = versionElement.text().trim();

        // Get the date from the 4th column
        const dateText = $(row).find('td:nth-child(4)').text().trim();
        const releaseDate = dateText ? new Date(dateText) : null;

        // Determine release type
        let releaseType = 'Stable';
        if (version.includes('alpha')) {
          releaseType = 'Alpha';
        } else if (version.includes('beta')) {
          releaseType = 'Beta';
        } else if (version.includes('rc')) {
          releaseType = 'RC';
        }

        if (version) {
          versions.push({
            version,
            releaseDate,
            releaseType
          });
          console.log(`Added version: ${version}, type: ${releaseType}, date: ${dateText}`);
        }
      });
    });

    return versions;
  } catch (error) {
    console.error(`Error scraping Maven versions for ${groupId}:${artifactId}:`, error);
    return [];
  }
}

/**
 * Scrape versions from Google Maven Repository
 */
async function scrapeGoogleMavenVersions(groupId, artifactId) {
  try {
    // Formato da URL do Google Maven Repository
    const googleMavenUrl = `https://dl.google.com/android/maven2/${groupId.replace(/\./g, '/')}/${artifactId}/maven-metadata.xml`;
    console.log(`Trying Google Maven Repository: ${googleMavenUrl}`);

    const response = await axios.get(googleMavenUrl);
    const $ = cheerio.load(response.data, { xmlMode: true });

    const versions = [];

    // Extrair versões do XML
    $('version').each((i, element) => {
      const version = $(element).text().trim();

      // Determinar o tipo de release
      let releaseType = 'Stable';
      if (version.includes('alpha')) {
        releaseType = 'Alpha';
      } else if (version.includes('beta')) {
        releaseType = 'Beta';
      } else if (version.includes('rc')) {
        releaseType = 'RC';
      }

      // Não temos a data de lançamento no Google Maven, então usamos a data atual
      versions.push({
        version,
        releaseDate: new Date(),
        releaseType
      });

      console.log(`Added version from Google Maven: ${version}, type: ${releaseType}`);
    });

    // Ordenar versões (mais recentes primeiro)
    versions.sort((a, b) => {
      return compareVersions(b.version, a.version);
    });

    return versions;
  } catch (error) {
    console.error(`Error scraping Google Maven for ${groupId}:${artifactId}:`, error);
    return [];
  }
}

/**
 * Compare version strings
 */
function compareVersions(a, b) {
  const aParts = a.split(/[\.-]/).map(part => {
    return /^\d+$/.test(part) ? parseInt(part) : part;
  });

  const bParts = b.split(/[\.-]/).map(part => {
    return /^\d+$/.test(part) ? parseInt(part) : part;
  });

  const minLength = Math.min(aParts.length, bParts.length);

  for (let i = 0; i < minLength; i++) {
    if (typeof aParts[i] === 'number' && typeof bParts[i] === 'number') {
      if (aParts[i] !== bParts[i]) {
        return aParts[i] - bParts[i];
      }
    } else {
      const aStr = String(aParts[i]);
      const bStr = String(bParts[i]);

      if (aStr !== bStr) {
        // alpha < beta < rc < (sem sufixo)
        if (aStr.includes('alpha')) return -1;
        if (bStr.includes('alpha')) return 1;
        if (aStr.includes('beta')) return -1;
        if (bStr.includes('beta')) return 1;
        if (aStr.includes('rc')) return -1;
        if (bStr.includes('rc')) return 1;

        return aStr.localeCompare(bStr);
      }
    }
  }

  return aParts.length - bParts.length;
}

/**
 * Scrape details for a specific library
 */
/**
 * Scrape details for a specific library
 */
async function scrapeLibraryDetails(libraryName) {
  try {
    // Primeiro obter informações básicas do site do Android Developer
    const libraryUrl = `${BASE_URL}/jetpack/androidx/releases/${libraryName}`;
    console.log(`Scraping library details from: ${libraryUrl}`);

    const response = await axios.get(libraryUrl);
    const $ = cheerio.load(response.data);

    // Analisar detalhes da biblioteca usando o módulo parser
    const libraryDetails = parser.parseLibraryPage($, libraryName);

    // Determinar o groupId (do parser ou padrão)
    const groupId = libraryDetails.groupId || `androidx.${libraryName.split('-')[0]}`;

    // Adicionar URL do Maven
    const mavenUrl = `${MAVEN_BASE_URL}/${groupId}/${libraryName}`;
    libraryDetails.mavenUrl = mavenUrl;

    // Tentar obter versões do Maven Repository
    let versions = await scrapeMavenVersions(groupId, libraryName);

    // Se não encontrar versões no Maven Repository, tentar o Google Maven
    if (versions.length === 0) {
      console.log(`No versions found on MVNRepository, trying Google Maven...`);
      versions = await scrapeGoogleMavenVersions(groupId, libraryName);
    }

    // Se ainda não encontrou versões, usar as que foram extraídas do site do Android Developer
    if (versions.length === 0 && libraryDetails.versions.length > 0) {
      console.log(`Using versions from Android Developer site: ${libraryDetails.versions.length} versions found`);
      versions = libraryDetails.versions;
    }

    // Se encontrou versões em alguma fonte
    if (versions.length > 0) {
      console.log(`Found ${versions.length} versions for ${libraryName}`);

      // Substituir as versões
      libraryDetails.versions = versions;

      // Atualizar tipos de release
      libraryDetails.stableRelease = null;
      libraryDetails.rcRelease = null;
      libraryDetails.betaRelease = null;
      libraryDetails.alphaRelease = null;

      // Definir a versão mais recente de cada tipo
      for (const version of versions) {
        if (version.releaseType === 'Stable' && !libraryDetails.stableRelease) {
          libraryDetails.stableRelease = version.version;
        } else if (version.releaseType === 'RC' && !libraryDetails.rcRelease) {
          libraryDetails.rcRelease = version.version;
        } else if (version.releaseType === 'Beta' && !libraryDetails.betaRelease) {
          libraryDetails.betaRelease = version.version;
        } else if (version.releaseType === 'Alpha' && !libraryDetails.alphaRelease) {
          libraryDetails.alphaRelease = version.version;
        }
      }

      // Definir última atualização a partir da versão mais recente
      if (versions.length > 0 && versions[0].releaseDate) {
        libraryDetails.lastUpdate = versions[0].releaseDate;
      }
    } else {
      console.log(`No versions found for ${libraryName} in any repository`);

      // Se não encontrou versões em nenhum lugar, adicionar uma versão padrão
      if (libraryDetails.versions.length === 0) {
        const defaultVersion = {
          version: '1.0.0',
          releaseDate: new Date(),
          releaseType: 'Stable'
        };

        libraryDetails.versions.push(defaultVersion);
        libraryDetails.stableRelease = defaultVersion.version;
        libraryDetails.lastUpdate = defaultVersion.releaseDate;

        console.log(`Added default version: ${defaultVersion.version}`);
      }
    }

    return libraryDetails;
  } catch (error) {
    console.error(`Error scraping details for ${libraryName}:`, error);
    // Retornar informações básicas se a página não existir ou outro erro
    return {
      name: libraryName,
      error: error.message
    };
  }
}

/**
 * Sync all libraries data
 */
/**
 * Sync all libraries data
 */
/**
 * Sync all libraries data
 */
async function syncAllLibraries() {
  try {
    // Get list of all libraries
    const { libraries, librariesWithDetails } = await scrapeLibrariesList();
    const results = {
      total: libraries.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      retried: 0,
      artifacts: 0
    };

    // Process each library
    for (const libraryName of libraries) {
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount <= maxRetries) {
        try {
          console.log(`Processing library: ${libraryName}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`);

          // Check if this library has detailed artifacts
          const hasDetailedArtifacts = librariesWithDetails.includes(libraryName);

          // Get library details
          const libraryDetails = await scrapeLibraryDetails(libraryName);

          if (libraryDetails.error) {
            console.log(`Skipping ${libraryName}: ${libraryDetails.error}`);
            results.skipped++;
            break;
          }

          // If this library has detailed artifacts, get them
          if (hasDetailedArtifacts) {
            console.log(`${libraryName} has detailed artifacts, scraping them...`);
            const artifacts = await scrapeLibraryArtifacts(libraryName);

            if (artifacts.length > 0) {
              // Add artifacts as dependencies
              libraryDetails.dependencies = artifacts.map(artifact => ({
                name: artifact.name,
                artifact: artifact.name,
                groupId: artifact.groupId || libraryDetails.groupId,
                stableRelease: artifact.stableRelease,
                rcRelease: artifact.rcRelease,
                betaRelease: artifact.betaRelease,
                alphaRelease: artifact.alphaRelease
              }));

              results.artifacts += artifacts.length;
              console.log(`Added ${artifacts.length} artifacts to ${libraryName}`);
            }
          }

          // Update or insert library in database
          await Library.findOneAndUpdate(
            { name: libraryName },
            libraryDetails,
            { upsert: true, new: true }
          );

          console.log(`Updated ${libraryName}`);
          results.updated++;

          // If we got here, it was successful, so break out of retry loop
          break;
        } catch (error) {
          retryCount++;

          if (retryCount <= maxRetries) {
            console.log(`Error processing ${libraryName}, will retry (${retryCount}/${maxRetries}): ${error.message}`);
            results.retried++;

            // Wait longer before retrying
            const retryDelay = 5000 * retryCount; // 5s, 10s, 15s
            await sleep(retryDelay);
          } else {
            console.error(`Failed to process ${libraryName} after ${maxRetries} retries:`, error);
            results.failed++;
          }
        }
      }

      // Add a delay between libraries to avoid being blocked
      const delay = Math.floor(Math.random() * 3000) + 5000; // 5-8 seconds
      console.log(`Waiting ${delay}ms before next library...`);
      await sleep(delay);
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