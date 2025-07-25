import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { clearStaleEventId } from '@/app/lib/eventIdValidator';
import { deepClone } from '@/app/lib/utils';
import type { User } from '@supabase/supabase-js';
import { Alert } from 'react-native';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
        }
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Failed to get session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        console.log('✅ Using deepClone with React Native compatible fallback');
        
        if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          console.log('🧹 Clearing cached eventIds due to auth state change:', event);
          clearStaleEventId('auth-state-change', `AuthProvider - ${event}`);
        }
        
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      
      console.log('Attempting sign in for:', cleanEmail);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password: password.trim()
      });
      
      if (error) {
        console.error('Sign in error:', error);
        
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and confirm your account before signing in.');
        } else {
          throw new Error(error.message);
        }
      }
      
      console.log('Sign in successful for:', data.user?.email);
      console.log('🧹 Clearing cached eventIds on user sign in');
      clearStaleEventId('user-sign-in', 'AuthProvider - signIn');
      
    } catch (error: any) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      
      const { data, error } = await supabase.auth.signUp({ 
        email: cleanEmail, 
        password: password.trim()
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.user && !data.user.email_confirmed_at) {
        try {
          await fetch('https://amoeqxpjmvopngvdcadl.supabase.co/functions/v1/2bc5d173-1a3d-4eee-ae0c-e884249baee7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_email: cleanEmail })
          });
        } catch (confirmError) {
          console.error('Auto-confirmation error:', confirmError);
        }
      }
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🧹 Clearing cached eventIds on user sign out');
      clearStaleEventId('user-sign-out', 'AuthProvider - signOut');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};