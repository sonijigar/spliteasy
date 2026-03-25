const React = require('react');
const { Text } = require('react-native');

const Ionicons = ({ name, ...props }) => React.createElement(Text, props, name);

module.exports = { Ionicons };
