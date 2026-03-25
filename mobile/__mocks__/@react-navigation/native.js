const useFocusEffect = jest.fn((cb) => cb());
const useNavigation = jest.fn(() => ({ navigate: jest.fn(), goBack: jest.fn() }));

module.exports = { useFocusEffect, useNavigation };
