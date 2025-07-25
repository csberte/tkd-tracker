export const unstable_settings = { ignore: true };

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Supabase configuration
const supabaseUrl = 'https://amoeqxpjmvopngvdcadl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtb2VxeHBqbXZvcG5ndmRjYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMDYxOTYsImV4cCI6MjA2NTU4MjE5Nn0.r2HsG-FBbdHnffa72bVHn-Sm0X3qlze4QDF-GI63YoM';

// Create Supabase client with proper configuration for React Native
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Configure auth settings for better mobile compatibility
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Set storage key to avoid conflicts
    storageKey: 'taekwondo-tracker-auth',
    // Configure for React Native environment
    ...(Platform.OS !== 'web' && {
      storage: undefined, // Use default AsyncStorage for React Native
    }),
  },
  // Add global configuration
  global: {
    headers: {
      'X-Client-Info': `taekwondo-tracker-${Platform.OS}`,
    },
  },
});

// Enhanced RPC call wrapper with better error handling
const rpcWithErrorHandling = async (functionName: string, params: any) => {
  try {
    console.log(`[RPC] Calling ${functionName} with params:`, params);
    
    const { data, error } = await supabase.rpc(functionName, params);
    
    console.log(`[RPC] ${functionName} response:`, { data, error });
    
    if (error) {
      console.error(`[RPC] ${functionName} error:`, error);
      throw new Error(`RPC ${functionName} failed: ${error.message}`);
    }
    
    return { data, error: null };
  } catch (err) {
    console.error(`[RPC] ${functionName} exception:`, err);
    return { data: null, error: err };
  }
};

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('Connection test failed:', error);
      return false;
    }
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Connection test error:', error);
    return false;
  }
};

// Fetch user function
export const fetchUser = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export { supabase, rpcWithErrorHandling };
export default { supabase, testConnection, fetchUser, rpcWithErrorHandling };