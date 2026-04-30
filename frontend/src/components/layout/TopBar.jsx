import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Bell, LogOut } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function TopBar() {
  const { user, role } = useAuth();
  const location = useLocation();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState({ display_name: '' });
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = React.useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      if (role === 'student') {
        const usn = user.email.split('@')[0].toUpperCase();
        supabase
          .from('students')
          .select('name, usn, email')
          .eq('usn', usn)
          .single()
          .then(({ data }) => {
            if (data) setProfile({ display_name: data.name, id: data.usn, email: data.email });
          });
      } else {
        supabase
          .from('users')
          .select('display_name, email')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile({ display_name: data.display_name, id: 'MENTOR-01', email: data.email });
          });
      }
    }
  }, [user, role]);

  // Generate a path title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Overview / Dashboard';
    if (path.includes('attendance') && !path.includes('me')) return 'Activity / Mark Attendance';
    if (path.includes('history')) return 'Activity / Student History';
    if (path.includes('materials')) return 'Activity / Materials';
    if (path.includes('upload')) return 'Data / Upload CSV';
    if (path.includes('me/attendance')) return 'Overview / My Attendance';
    if (path.includes('me/upcoming')) return 'Overview / Upcoming Sessions';
    if (path.includes('me/materials')) return 'Overview / Class Materials';
    return 'Overview';
  };

  return (
    <header className="h-20 bg-void/80 backdrop-blur-md border-b border-subtle sticky top-0 z-10 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <h1 className="text-body font-medium text-primary">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-8">
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="input pl-10 h-10 w-64 bg-surface rounded-full border-subtle focus:border-strong"
          />
        </div>

        <div className="relative" ref={dropdownRef}>
          <div 
            className="flex items-center gap-3 pl-8 border-l border-subtle cursor-pointer group"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-primary group-hover:text-accent-glow transition-colors">
                {profile.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0]}
              </span>
              <span className="text-micro text-tertiary capitalize">{role}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-accent-glow/10 border border-accent-glow/30 flex items-center justify-center text-accent-glow font-medium group-hover:scale-105 transition-all">
              {(profile.display_name || user?.user_metadata?.display_name || user?.email)?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>

          {showDropdown && (
            <div className="absolute right-0 mt-3 w-72 bg-surface-raised border border-strong rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 overflow-hidden">
              <div className="p-5 border-b border-subtle bg-surface-inset">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent-glow flex items-center justify-center text-white text-xl font-bold">
                    {(profile.display_name || user?.user_metadata?.display_name || user?.email)?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-primary truncate max-w-[150px]">{profile.display_name || 'Forge User'}</p>
                    <p className="text-[10px] font-black text-accent-glow uppercase tracking-[0.2em]">{role}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="font-mono truncate">{profile.email || user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-tertiary">
                    <div className="w-1.5 h-1.5 rounded-full bg-subtle"></div>
                    <span>ID: {profile.id || user?.user_metadata?.student_id || 'MENTOR-01'}</span>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button 
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-all group"
                >
                  <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
