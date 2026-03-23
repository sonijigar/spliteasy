const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/**
 * Intercept react-native-screens Fabric component specs before Metro bundles
 * them. Each file in react-native-screens/src/fabric/ calls
 * `codegenNativeComponent()`, which triggers React Native's codegen prop-type
 * validator at import time. On RN 0.83 + react-native-screens 4.24.x the
 * validator crashes with "Unknown prop type: undefined" because the TypeScript
 * parser cannot handle certain type constructs used in those specs.
 *
 * We redirect every fabric/* import to a plain-View stub so the validator
 * never runs. Navigation still works because App.js calls enableScreens(false),
 * which makes all react-navigation components render plain React Native Views
 * instead of native screen components.
 */
const FABRIC_STUB = path.resolve(__dirname, 'src/mocks/fabricComponentStub.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.includes('react-native-screens') &&
    moduleName.includes('/fabric/')
  ) {
    return { filePath: FABRIC_STUB, type: 'sourceFile' };
  }
  // Fall through to default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
