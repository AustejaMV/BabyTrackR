import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, serverUrl } from '../utils/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: Error | null }>;
  signOut: () => Promise<void>;
  familyId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session) {
        loadFamily(session.access_token);
      }
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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadFamily = async (accessToken: string) => {
    try {
      const response = await fetch(`${serverUrl}/family`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      const result = await response.json();
      
      if (result.family) {
        setFamilyId(result.family.id);
      } else {
        // Check for invites
        const invitesResponse = await fetch(`${serverUrl}/family/invites`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        const invitesResult = await invitesResponse.json();
        
        if (invitesResult.invites && invitesResult.invites.length > 0) {
          // Auto-accept first invite
          const invite = invitesResult.invites[0];
          const acceptResponse = await fetch(`${serverUrl}/family/accept-invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ inviteId: invite.id }),
          });
          
          const acceptResult = await acceptResponse.json();
          if (acceptResult.familyId) {
            setFamilyId(acceptResult.familyId);
          }
        } else {
          // Create new family
          const createResponse = await fetch(`${serverUrl}/family/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ familyName: 'My Family' }),
          });
          
          const createResult = await createResponse.json();
          setFamilyId(createResult.familyId);
        }
      }
    } catch (error) {
      console.error('Error loading family:', error);
    }
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
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithEmail, signUpWithEmail, signOut, familyId }}
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
