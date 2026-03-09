import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, serverUrl, supabaseAnonKey } from '../utils/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: Error | null }>;
  signOut: () => Promise<void>;
  familyId: string | null;
  refreshFamily: () => Promise<string | null>;
  setFamilyIdFromCreate: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  // Avoid creating a second family when loadFamily runs twice (getSession + onAuthStateChange)
  const createdFamilyIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Get initial session and load family before marking ready (so familyId is set before user sees app)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        await loadFamily(session.access_token);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session) {
        loadFamily(session.access_token);
      } else {
        setFamilyId(null);
        createdFamilyIdRef.current = null;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadFamily = async (accessToken: string): Promise<string | null> => {
    try {
      const response = await fetch(`${serverUrl}/family`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      const result = await response.json();
      
      if (result.family) {
        setFamilyId(result.family.id);
        createdFamilyIdRef.current = null;
        return result.family.id;
      }
      // GET returned null: if we already created a family this session, reuse it (avoids double-create when loadFamily runs twice)
      if (createdFamilyIdRef.current) {
        setFamilyId(createdFamilyIdRef.current);
        return createdFamilyIdRef.current;
      }
      // Check for invites (by current user's email from token)
      const invitesResponse = await fetch(`${serverUrl}/family/invites`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      let invitesResult: { invites?: { id: string }[]; noEmail?: boolean } = { invites: [] };
      try {
        const data = await invitesResponse.json();
        if (data && Array.isArray(data.invites)) invitesResult = data;
        if (data?.noEmail) invitesResult.noEmail = true;
      } catch {
        // e.g. 404 HTML body; treat as no invites
      }

      if (invitesResult.invites && invitesResult.invites.length > 0) {
        const invite = invitesResult.invites[0];
        const acceptResponse = await fetch(`${serverUrl}/family/accept-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ inviteId: invite.id }),
        });
        const acceptResult = await acceptResponse.json().catch(() => ({}));
        if (acceptResponse.ok && acceptResult.familyId) {
          setFamilyId(acceptResult.familyId);
          return acceptResult.familyId;
        }
        console.error('Accept invite failed', acceptResponse.status, acceptResult);
        // Don't fall through to create – invitee should retry or fix the invite
        return null;
      } else {
        const createResponse = await fetch(`${serverUrl}/family/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ familyName: 'My Family' }),
        });
        
        const createResult = await createResponse.json();
        // Use familyId even when server returned 500 (e.g. read-back failed but family was created)
        if (createResult?.familyId) {
          createdFamilyIdRef.current = createResult.familyId;
          setFamilyId(createResult.familyId);
          return createResult.familyId;
        }
      }
    } catch (error) {
      console.error('Error loading family:', error);
    }
    return null;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error signing in with email:', error);
      return { error };
    }

    return {};
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Send confirmation links back to the current app URL
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error('Error signing up with email:', error);
      return { error };
    }

    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setFamilyId(null);
    createdFamilyIdRef.current = null;
  };

  const refreshFamily = useCallback(async (): Promise<string | null> => {
    if (session?.access_token) return loadFamily(session.access_token);
    return null;
  }, [session?.access_token]);

  const setFamilyIdFromCreate = useCallback((id: string) => {
    createdFamilyIdRef.current = id;
    setFamilyId(id);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithEmail, signUpWithEmail, signOut, familyId, refreshFamily, setFamilyIdFromCreate }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
