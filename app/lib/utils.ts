// Utility functions for validation and common operations

/**
 * Validates if a string is a valid UUID v4
 * @param uuid - The string to validate
 * @returns boolean - True if valid UUID, false otherwise
 */
export const validateUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Checks if a UUID is a known problematic hardcoded value
 * @param uuid - The UUID to check
 * @returns boolean - True if it's a problematic UUID
 */
export const isProblematicUUID = (uuid: string): boolean => {
  const problematicUUIDs = [
    '825717f4-7d11-48b5-85bc-61caec00ad3a',
    '00000000-0000-0000-0000-000000000000'
  ];
  
  return problematicUUIDs.includes(uuid);
};

/**
 * Validates an event object has required properties
 * @param event - The event object to validate
 * @returns boolean - True if valid event object
 */
export const validateEventObject = (event: any): boolean => {
  if (!event || typeof event !== 'object') {
    return false;
  }
  
  return (
    event.id &&
    validateUUID(event.id) &&
    !isProblematicUUID(event.id) &&
    typeof event.name === 'string' &&
    event.name.length > 0
  );
};

/**
 * Returns color based on tournament status
 * @param status - The tournament status
 * @returns string - Color hex code
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'upcoming':
      return '#4A90E2'; // Blue
    case 'ongoing':
      return '#7ED321'; // Green
    case 'completed':
      return '#9B9B9B'; // Gray
    default:
      return '#4A90E2'; // Default blue
  }
};

/**
 * Deep clone function with React Native compatible fallback
 * @param obj - Object to clone
 * @returns Cloned object
 */
export const deepClone = <T>(obj: T): T => {
  console.log('Using deepClone with React Native compatible fallback');
  
  // Use JSON-based cloning for React Native compatibility
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.warn('deepClone fallback failed:', error);
    return obj;
  }
};