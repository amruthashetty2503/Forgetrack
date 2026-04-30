import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Forbidden() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_600px_300px_at_50%_-100px,rgba(244,63,94,0.15),rgba(244,63,94,0)_70%)] pointer-events-none" />
      
      <div className="card w-full max-w-md text-center z-10 border-danger/20">
        <div className="w-16 h-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 border border-danger/20">
          403
        </div>
        <h1 className="text-display-sm text-primary mb-3">Access Denied</h1>
        <p className="text-body text-secondary mb-2">
          You don't have permission to view this page.
        </p>
        <div className="bg-surface-inset p-3 rounded-lg mb-8 text-xs font-mono text-tertiary">
          User: {user?.email || 'Not logged in'}<br/>
          Role: {role || 'None'}
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="btn-primary w-full"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
