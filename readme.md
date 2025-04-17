# AndroidX Version Catalog Generator

A web service that scrapes AndroidX libraries and generates Version Catalog files for Android projects.

## 📋 About the Project

This project is a web service that:

1. Scrapes the official AndroidX page (`https://developer.android.com/jetpack/androidx/versions`)
2. Extracts detailed information about each library (versions, dependencies, etc.)
3. Stores the data in a MongoDB database
4. Allows generating Version Catalog (TOML) files for use in Android projects


<img src="https://github.com/user-attachments/assets/31ed8eea-ae9c-42b5-8968-72fbb31752aa" width="80%" /><br/>
<img src="https://github.com/user-attachments/assets/c3f7e3e5-efaf-4765-9f36-ded1c95042fc" width="80%" /><br/>
<img src="https://github.com/user-attachments/assets/bacbab38-f5c8-4c0e-886a-a13f710d2daf" width="80%" /><br/>
<img src="https://github.com/user-attachments/assets/c26a4c12-71d7-4b4a-a1a4-06e3fa9f2f7a" width="80%" /><br/>

## 🚀 Technologies Used

- **Backend**: Node.js, Express
- **Frontend**: Nunjucks (templates), Bootstrap 5
- **Database**: MongoDB
- **Infrastructure**: Docker, Docker Compose
- **Scraping**: Axios, Cheerio

## 🔧 Prerequisites

- Docker and Docker Compose
- Git

## ⚙️ Installation and Execution

### 1. Clone the repository

```bash
git clone https://github.com/jacksonfdam/androidx-cataloger.git
cd androidx-cataloger
```

### 2. Prepare the environment for MongoDB

```bash
mkdir -p data/mongodb
chmod -R 777 data/mongodb
```

### 3. Start the containers with Docker Compose

```bash
docker-compose up -d
```

### 4. Access the application

Open your browser and access:
- Web interface: http://localhost:3000
- Sync data: http://localhost:3000/api/sync

## 🌐 API Endpoints

### REST API

- `GET /api/sync` - Runs the scraper and updates the database
- `GET /api/libraries` - Lists all libraries
- `GET /api/library/:name` - Details of a specific library

### Frontend

- `GET /` - Home page with list of libraries
- `GET /library/:name` - Details page for a specific library
- `POST /catalog` - Generates a Version Catalog with selected libraries

## 📦 Project Structure

```
androidx-cataloger/
├── data/
│   └── mongodb/              ← MongoDB persistent data
├── public/                   ← static files
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── main.js
├── src/
│   ├── api/                  ← API routes
│   │   ├── routes.js
│   │   └── controllers.js
│   ├── frontend/             ← web interface routes
│   │   └── routes.js
│   ├── scraper/              ← scraping logic
│   │   ├── index.js
│   │   └── parser.js
│   ├── templates/            ← .njk files (Nunjucks)
│   │   ├── layout.njk
│   │   ├── index.njk
│   │   ├── library_detail.njk
│   │   └── catalog_result.njk
│   ├── db/
│   │   └── connection.js
│   └── server.js             ← application entry point
├── Dockerfile
├── docker-compose.yml
├── .gitignore
└── package.json
```

## 🔍 Features

### 1. AndroidX Libraries Scraping
- Extracts data from the main AndroidX page
- Accesses individual pages for each library
- Collects detailed information (versions, dependencies, etc.)

### 2. Version Catalog Generation
- TOML format compatible with Gradle
- Example of usage in build.gradle.kts
- Copy to clipboard functionality

### 3. Library Details
- Shows all available versions
- Lists dependencies
- Provides implementation snippets
- Links to Maven Repository and official documentation

## 📝 Example of Generated Version Catalog

```toml
# Generated AndroidX Version Catalog

[versions]
activity = "1.8.0"
compose_ui = "1.5.4"

[libraries]
activity = { module = "androidx.activity:activity", version.ref = "activity" }
activity_ktx = { module = "androidx.activity:activity-ktx", version.ref = "activity" }
compose_ui = { module = "androidx.compose.ui:ui", version.ref = "compose_ui" }
```

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Android Developer Documentation
- The Node.js and Express communities
- All open-source libraries used in this project