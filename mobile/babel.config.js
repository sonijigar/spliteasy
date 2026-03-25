module.exports = (api) => {
  const isTest = api.env('test');
  if (isTest) {
    return {
      plugins: ['babel-plugin-syntax-hermes-parser'],
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    };
  }
  return {
    presets: ['module:metro-react-native-babel-preset'],
  };
};
