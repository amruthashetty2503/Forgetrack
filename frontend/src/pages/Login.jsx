import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { user, role, loading: authLoading, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('student'); // 'student' or 'mentor'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Use useEffect to handle navigation after login
  React.useEffect(() => {
    if (user && role && !authLoading) {
      if (role === 'mentor') navigate('/dashboard');
      else if (role === 'student') navigate('/me/dashboard');
    }
  }, [user, role, authLoading, navigate]);

  // Handle "Setup Incomplete" case separately
  if (user && !authLoading && role === null) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-4">
        <div className="card max-w-md text-center border-danger/20">
          <h2 className="text-display-sm text-danger mb-4">Setup Incomplete</h2>
          <p className="text-body text-secondary mb-4">
            Your account exists, but no role is assigned to it.
          </p>
          <button className="btn-primary" onClick={() => {
            supabase.auth.signOut();
            window.location.reload();
          }}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('Login Button Clicked!', { tab, identifier, password });
    
    // 1. DEMO BYPASS: Mentor (Require specific password)
    if (tab === 'mentor' && identifier.toLowerCase().includes('nischay')) {
      if (password === 'password123') {
        console.log('Mentor Bypass Triggered');
        await loginAsDemo('mentor', identifier);
        navigate('/dashboard');
        return;
      } else {
        setError('Invalid password for mentor account');
        return;
      }
    }

    // 2. DEMO BYPASS: Any Student USN starting with 4SH (Password must match USN)
    if (tab === 'student' && identifier.toUpperCase().startsWith('4SH') && password.toUpperCase() === identifier.toUpperCase()) {
      console.log('Student Bypass Triggered for', identifier);
      await loginAsDemo('student', `${identifier.toLowerCase()}@forge.local`);
      navigate('/me/dashboard');
      return;
    }

    setLoginLoading(true);
    setError('');

    try {
      let emailToLogin = identifier;

      if (tab === 'student') {
        const { data: emailData, error: rpcError } = await supabase.rpc('get_email_by_usn', { p_usn: identifier });
        if (rpcError || !emailData) throw new Error('Invalid USN or password');
        emailToLogin = emailData;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password: password,
      });

      if (authError) throw authError;
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_600px_300px_at_50%_-100px,rgba(99,102,241,0.18),rgba(99,102,241,0)_70%)] pointer-events-none" />
      
      <div className="card w-full max-w-md z-10 relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent-glow rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
            F
          </div>
          <h1 className="text-display-sm text-primary mb-2">ForgeTrack</h1>
          <p className="text-body text-secondary">Sign in to your account</p>
        </div>

        <div className="flex p-1 bg-surface-inset rounded-lg mb-6">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'student' ? 'bg-surface-raised text-primary shadow-sm' : 'text-tertiary hover:text-secondary'}`}
            onClick={() => setTab('student')}
          >
            Student
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'mentor' ? 'bg-surface-raised text-primary shadow-sm' : 'text-tertiary hover:text-secondary'}`}
            onClick={() => setTab('mentor')}
          >
            Mentor
          </button>
        </div>

        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-md text-danger text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-label text-secondary block mb-1.5">
              {tab === 'student' ? 'USN' : 'EMAIL ADDRESS'}
            </label>
            <input
              type={tab === 'student' ? 'text' : 'email'}
              className="input"
              placeholder={tab === 'student' ? 'e.g. 4SH24CS001' : 'name@theboringpeople.in'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-label text-secondary block mb-1.5">PASSWORD</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary mt-2" disabled={loginLoading}>
            {loginLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        {tab === 'student' && (
          <p className="text-micro text-tertiary text-center mt-6">
            Default password is your USN (case sensitive).
          </p>
        )}
      </div>
    </div>
  );
}
