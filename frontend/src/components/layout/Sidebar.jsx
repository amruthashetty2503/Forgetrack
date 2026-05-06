import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, CheckSquare, Clock, FileText, Upload, LogOut, Calendar } from 'lucide-react';

export default function Sidebar() {
  const { role, signOut } = useAuth();
  const location = useLocation();

  const isMentor = role === 'mentor';

  const menuItems = isMentor ? [
    { section: 'OVERVIEW', items: [
      { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> }
    ]},
    { section: 'ACTIVITY', items: [
      { name: 'Schedule Manager', path: '/sessions', icon: <Calendar size={18} /> },
      { name: 'Mark Attendance', path: '/attendance', icon: <CheckSquare size={18} /> },
      { name: 'Student History', path: '/history', icon: <Clock size={18} /> },
      { name: 'Materials', path: '/materials', icon: <FileText size={18} /> }
    ]},
    { section: 'DATA', items: [
      { name: 'Upload CSV', path: '/upload', icon: <Upload size={18} /> }
    ]}
  ] : [
    { section: 'OVERVIEW', items: [
      { name: 'Dashboard', path: '/me/dashboard', icon: <LayoutDashboard size={18} /> },
      { name: 'My Attendance', path: '/me/attendance', icon: <CheckSquare size={18} /> },
      { name: 'Upcoming Sessions', path: '/me/upcoming', icon: <Clock size={18} /> },
      { name: 'Class Materials', path: '/me/materials', icon: <FileText size={18} /> }
    ]}
  ];

  return (
    <aside className="w-64 bg-void border-r border-strong flex flex-col h-screen fixed left-0 top-0 z-20">
      <div className="p-6 border-b border-subtle flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-glow flex items-center justify-center text-white font-bold">
          F
        </div>
        <span className="text-body font-semibold text-primary tracking-wide">ForgeTrack</span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-8">
        {menuItems.map((group, idx) => (
          <div key={idx}>
            <h3 className="text-micro text-tertiary mb-3 pl-3">{group.section}</h3>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-surface-raised text-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]' 
                        : 'text-secondary hover:text-primary hover:bg-surface-inset'
                    }`}
                  >
                    <span className={isActive ? 'text-accent-glow' : 'text-tertiary'}>
                      {item.icon}
                    </span>
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-subtle">
        <button 
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut size={18} className="text-tertiary group-hover:text-danger" />
          Logout
        </button>
      </div>
    </aside>
  );
}
