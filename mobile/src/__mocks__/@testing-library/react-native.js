/**
 * Lightweight mock for @testing-library/react-native.
 * Uses react-test-renderer under the hood.
 */
const React = require('react');
const { act } = require('react');

let renderer;
try {
  renderer = require('react-test-renderer');
} catch (e) {
  renderer = null;
}

function render(component) {
  if (!renderer) throw new Error('react-test-renderer not available');
  let instance;
  act(() => {
    instance = renderer.create(component);
  });
  const root = instance;

  function getAllByText(text) {
    const results = [];
    function traverse(node) {
      if (!node) return;
      if (typeof node === 'string' && node === text) {
        results.push(node);
        return;
      }
      if (node.props) {
        if (node.props.children) {
          if (typeof node.props.children === 'string' && node.props.children === text) {
            results.push(node);
          } else if (Array.isArray(node.props.children)) {
            node.props.children.forEach(traverse);
          } else {
            traverse(node.props.children);
          }
        }
      }
    }
    const json = root.toJSON();
    if (Array.isArray(json)) json.forEach(traverse);
    else traverse(json);
    return results;
  }

  function getByText(text) {
    const results = getAllByText(text);
    if (results.length === 0) throw new Error(`Unable to find element with text: ${text}`);
    return results[0];
  }

  function findNodeByProp(json, propKey, propValue) {
    if (!json) return null;
    if (json.props && json.props[propKey] === propValue) return json;
    if (json.children) {
      for (const child of json.children) {
        const found = findNodeByProp(child, propKey, propValue);
        if (found) return found;
      }
    }
    return null;
  }

  function getByPlaceholderText(placeholder) {
    const json = root.toJSON();
    const node = findNodeByProp(json, 'placeholder', placeholder);
    if (!node) throw new Error(`Unable to find element with placeholder: ${placeholder}`);
    return node;
  }

  return { getByText, getByPlaceholderText, getAllByText, root: instance };
}

function fireEvent(element, eventName, ...args) {
  if (!element || !element.props) return;
  const handler = element.props[eventName] || element.props[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`];
  if (handler) handler(...args);
}

fireEvent.press = (element) => {
  if (element && element.props && element.props.onPress) {
    element.props.onPress();
  }
};

async function waitFor(fn, options = {}) {
  const timeout = options.timeout || 4000;
  const interval = options.interval || 50;
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeout) {
    try {
      await fn();
      return;
    } catch (e) {
      lastError = e;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  throw lastError;
}

module.exports = { render, fireEvent, waitFor, act };
