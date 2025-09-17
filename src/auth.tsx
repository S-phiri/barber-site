import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { loginApi, registerApi, getMe, logoutApi } from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  ready: boolean;
  user: User | null;
  access: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<string | null>(null);

  // Hydrate user on load
  useEffect(() => {
    const hydrateUser = async () => {
      try {
        const response = await getMe();
        setUser(response); // Direct response, not response.data
        setAccess('session'); // Session-based auth indicator
      } catch (error) {
        // User not authenticated
        setUser(null);
        setAccess(null);
      } finally {
        setReady(true);
      }
    };

    hydrateUser();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // Login with session cookies
      await loginApi({ 
        username: username.trim(), 
        password 
      });
      
      // Set session indicator
      setAccess('session');
      
      // Fetch user data
      const userResponse = await getMe();
      setUser(userResponse); // Direct response, not userResponse.data
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      // Register user
      await registerApi({ username: username.trim(), email: email.trim(), password });
      
      // Auto-login after successful registration
      await login(username, password);
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear local state
      setUser(null);
      setAccess(null);
    }
  };

  const value: AuthContextType = {
    ready,
    user,
    access,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}