// Polyfill for structuredClone compatibility across all React Native environments

if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

export function safeClone<T>(obj: T): T {
  const clone = typeof structuredClone === 'function'
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj));
  return clone;
}

// Replace all existing deepClone usage with this polyfill
export const deepClone = safeClone;

// Export as default for easier imports
export default safeClone;