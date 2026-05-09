import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (log in, log out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id, session.user.email);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId, userEmail) => {
    // EMERGENCY BYPASS: For demo purposes, force role if email matches
    const emailToCheck = userEmail || user?.email;
    const lowerEmail = emailToCheck?.toLowerCase();
    
    if (lowerEmail?.includes('nischay')) {
      console.log('Emergency Bypass: Forcing Mentor role for', emailToCheck);
      setRole('mentor');
      setLoading(false);
      return;
    }

    if (lowerEmail?.endsWith('@forge.local')) {
      console.log('Emergency Bypass: Forcing Student role for', emailToCheck);
      setRole('student');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      setRole(data?.role || null);
    } catch (error) {
      console.error('Error fetching role:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async (demoRole, demoEmail, forcedName = null) => {
    setLoading(true);
    console.log('LoginAsDemo started for', demoEmail);

    let displayName = forcedName || (demoRole === 'mentor' ? 'Mentor' : 'Student');
    let studentId = null;

    try {
      if (!forcedName && demoRole === 'student') {
        const usn = demoEmail.split('@')[0].toUpperCase();
        console.log('Fetching name for USN:', usn);
        
        // Use RPC to bypass RLS during the demo login process
        const { data: nameData, error: nameError } = await supabase
          .rpc('get_student_name_by_usn', { p_usn: usn });
        
        if (!nameError && nameData) {
          displayName = nameData;
          console.log('Found name:', displayName);
        } else {
          console.warn('Could not find name for USN via RPC:', nameError);
        }
      } else if (!forcedName && demoRole === 'mentor') {
        // Use email prefix as name (e.g. nischay@theboringpeople.in -> Nischay)
        const emailPrefix = demoEmail.split('@')[0];
        displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).toLowerCase();
      }
    } catch (err) {
      console.error('Error fetching demo profile:', err);
    }

    setUser({ 
      id: 'demo-uuid', 
      email: demoEmail, 
      user_metadata: { display_name: displayName, role: demoRole, student_id: studentId } 
    });
    setRole(demoRole);
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
