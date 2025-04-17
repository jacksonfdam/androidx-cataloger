const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/androidx';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define Library schema
const librarySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  groupId: String,
  lastUpdate: Date,
  stableRelease: String,
  rcRelease: String,
  betaRelease: String,
  alphaRelease: String,
  versions: [{
    version: String,
    releaseDate: Date,
    releaseType: {
      type: String,
      enum: ['Stable', 'RC', 'Beta', 'Alpha']
    }
  }],
  dependencies: [{
    name: String,
    artifact: String,
    groupId: String
  }],
  mavenUrl: String
});

const Library = mongoose.model('Library', librarySchema);

module.exports = {
  mongoose,
  Library
};