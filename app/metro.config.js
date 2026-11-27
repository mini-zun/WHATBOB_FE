const { getDefaultConfig } = require('expo/metro-config');
const { writePlacesFontManifest } = require('./scripts/places-font-manifest.cjs');

writePlacesFontManifest(__dirname);

module.exports = getDefaultConfig(__dirname);
