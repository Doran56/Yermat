const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Empêche Metro de tenter de bundler les fichiers .env* (ex: .env.backfill.local,
// utilisé uniquement par scripts/backfill_compress_videos.mjs en Node direct) —
// ces fichiers ne sont jamais importés par l'app et ne sont pas du JS valide.
config.resolver.blockList = [
  ...(config.resolver.blockList
    ? (Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList])
    : []),
  /\.env(\..*)?$/,
];

module.exports = withNativeWind(config, { input: './global.css' });
