// Configuration Babel : preset Expo + NativeWind (Tailwind pour React Native).
// Le plugin de react-native-reanimated/worklets est ajouté automatiquement par babel-preset-expo.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
