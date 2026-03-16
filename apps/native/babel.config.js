module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      // nativewind/babel removed — NativeWind v4 uses withNativeWind() in metro.config.js
      'react-native-reanimated/plugin',
    ],
  };
};
