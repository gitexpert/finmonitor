import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { DatabaseProfile } from '../types/database';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<AuthUser | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single<DatabaseProfile>();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (!profile) {
        return null;
      }

      return {
        id: profile.user_id,
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        createdAt: profile.created_at,
      };
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  const handleSessionChange = useCallback(async (session: Session | null) => {
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      setState({
        user: profile,
        isAuthenticated: !!profile,
        isLoading: false,
        error: null,
      });
    } else {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          await handleSessionChange(session);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Failed to initialize authentication',
          });
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Never await inside onAuthStateChange — it holds a lock that blocks all DB calls.
        // Defer async work with setTimeout to release the lock first.
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (mounted) {
            setTimeout(() => { handleSessionChange(session); }, 0);
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSessionChange]);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let errorMessage = 'Login failed';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email to confirm your account';
        } else {
          errorMessage = error.message;
        }

        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        return { error: errorMessage };
      }

      // Wait for profile to be created via trigger, then fetch it
      let retries = 0;
      const maxRetries = 10;
      while (retries < maxRetries) {
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          setState({
            user: profile,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { error: null };
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        retries++;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Account created but profile setup failed. Please try again.',
      }));
      return { error: 'Account created but profile setup failed' };
    } catch (err) {
      const errorMessage = 'An unexpected error occurred';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<{ error: string | null }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) {
        let errorMessage = 'Signup failed';
        if (error.message.includes('already registered')) {
          errorMessage = 'An account with this email already exists';
        } else if (error.message.includes('Password')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }

        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        return { error: errorMessage };
      }

      if (!data.user) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Failed to create account' }));
        return { error: 'Failed to create account' };
      }

      // Wait for profile to be created via trigger
      let retries = 0;
      const maxRetries = 10;
      while (retries < maxRetries) {
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          setState({
            user: profile,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { error: null };
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        retries++;
      }

      setState({
        user: {
          id: data.user.id,
          email,
          name,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { error: null };
    } catch (err) {
      const errorMessage = 'An unexpected error occurred';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await supabase.auth.signOut();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
