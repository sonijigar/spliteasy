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
 * We redirect every import that resolves into the fabric/ directory to a
 * plain-View stub so the validator never runs. Navigation still works because
 * App.js calls enableScreens(false), which makes all react-navigation
 * components render plain React Native Views instead of native screen
 * components.
 *
 * IMPORTANT: We must resolve the module first and check the *file path*, not
 * the module name string. react-native-screens uses relative imports internally
 * (e.g. "../fabric/ScreenNativeComponent"), so the module name never contains
 * the string "react-native-screens" and a string-match on moduleName alone
 * would silently miss every one of them.
 */
const FABRIC_STUB = path.resolve(__dirname, 'src/mocks/fabricComponentStub.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolved = context.resolveRequest(context, moduleName, platform);
  if (
    resolved != null &&
    resolved.type === 'sourceFile' &&
    resolved.filePath.includes('react-native-screens') &&
    resolved.filePath.includes(`${path.sep}fabric${path.sep}`)
  ) {
    return { type: 'sourceFile', filePath: FABRIC_STUB };
  }
  return resolved;
};

module.exports = config;
