import { useState, useEffect } from 'react';

/**
 * A custom hook to sync state with localStorage.
 * 
 * @param {string} key The localStorage key.
 * @param {any} initialValue The initial value if no value exists in localStorage.
 * @returns {[any, Function]} The state and the state setter function.
 */
export function useLocalStorage(key, initialValue) {
  // Get initial value from localStorage or fallback
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
      
      // If initialValue is a function, execute it
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    }
  });

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
