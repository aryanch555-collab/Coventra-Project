import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  provisionUserAccount: (name: string, email: string, password: string, assignedRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  fetchManagedUsers: () => Promise<UserProfile[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_KEY = 'callflow_auth_token_v3';
const PROFILE_KEY = 'callflow_auth_profile_v3';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on startup
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedProfile = localStorage.getItem(PROFILE_KEY);

      if (savedToken && savedProfile) {
        const parsedProfile = JSON.parse(savedProfile) as UserProfile;
        setToken(savedToken);
        setProfile(parsedProfile);
        setUser({
          uid: parsedProfile.uid,
          email: parsedProfile.email,
          displayName: parsedProfile.displayName,
          getIdToken: async () => savedToken
        } as unknown as User);
      }
    } catch (err) {
      console.error('Error restoring session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Server-side Verified Email/Password Sign-In
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Authentication failed. Please verify your credentials.'
        };
      }

      const userProfile: UserProfile = {
        uid: data.user.uid,
        email: data.user.email,
        displayName: data.user.name,
        role: data.user.role,
        createdAt: data.user.createdAt,
        lastActiveAt: new Date().toISOString()
      };

      setToken(data.token);
      setProfile(userProfile);
      setUser({
        uid: data.user.uid,
        email: data.user.email,
        displayName: data.user.name,
        getIdToken: async () => data.token
      } as unknown as User);

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(userProfile));

      return { success: true };
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      const msg = err instanceof Error ? err.message : 'Server error occurred during sign in.';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  // Server-side Action: Manager provisions new account securely
  // Verifies caller is manager; caller remains signed in without session disruption!
  const provisionUserAccount = async (
    name: string, 
    email: string, 
    password: string, 
    assignedRole: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token || profile?.role !== 'manager') {
      return { success: false, error: 'Unauthorized: Only managers can provision user accounts.' };
    }

    try {
      const res = await fetch('/api/manager/provision-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role: assignedRole
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to provision account.' };
      }

      return { success: true };
    } catch (err: unknown) {
      console.error('Provisioning error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error provisioning account.'
      };
    }
  };

  // Fetch managed users from server
  const fetchManagedUsers = async (): Promise<UserProfile[]> => {
    if (!token || profile?.role !== 'manager') return [];
    try {
      const res = await fetch('/api/manager/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        return data.users.map((u: { uid: string; email: string; name: string; role: UserRole; createdAt: string }) => ({
          uid: u.uid,
          email: u.email,
          displayName: u.name,
          role: u.role,
          createdAt: u.createdAt
        }));
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch users:', err);
      return [];
    }
  };

  const signOut = async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const role: UserRole = profile?.role || 'agent';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        token,
        loading,
        signIn,
        provisionUserAccount,
        signOut,
        fetchManagedUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
