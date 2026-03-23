/**
 * Stub for react-native-screens Fabric (New Architecture) native components.
 *
 * react-native-screens >=4.24.0 ships TypeScript Fabric component specs that
 * contain prop types (e.g. `| null` unions, qualified `CT.*` names) that the
 * React Native 0.83 codegen TypeScript parser cannot handle. This causes a
 * fatal "Unknown prop type: undefined" red-screen error that fires at import
 * time, before any JavaScript (including `enableScreens(false)`) can run.
 *
 * Metro's `resolveRequest` in metro.config.js redirects every
 * `react-native-screens/src/fabric/*` import here so the codegen validator
 * never sees the broken specs. Navigation continues to work because
 * `enableScreens(false)` (called in App.js) makes all navigators fall back
 * to plain React Native Views regardless.
 *
 * Remove this stub (and the metro.config.js resolver) once the project is
 * upgraded to a react-native-screens version whose Fabric specs are fully
 * compatible with the installed React Native codegen.
 */

import { View } from 'react-native';

export default View;
