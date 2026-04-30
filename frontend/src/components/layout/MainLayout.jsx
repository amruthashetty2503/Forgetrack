import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-void text-primary">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_600px_300px_at_50%_-100px,rgba(99,102,241,0.18),rgba(99,102,241,0)_70%)] pointer-events-none" />
        <TopBar />
        <main className="flex-1 p-8 overflow-y-auto z-0 relative">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
