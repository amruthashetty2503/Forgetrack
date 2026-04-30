import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RoleGuard from './components/RoleGuard';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Forbidden from './pages/Forbidden';
import Dashboard from './pages/mentor/Dashboard';
import MarkAttendance from './pages/mentor/MarkAttendance';
import StudentHistory from './pages/mentor/StudentHistory';
import Materials from './pages/mentor/Materials';
import UploadCSV from './pages/mentor/UploadCSV';
import MyAttendance from './pages/student/MyAttendance';
import StudentMaterials from './pages/student/StudentMaterials';
import UpcomingSessions from './pages/student/UpcomingSessions';
import DevTokens from './DevTokens'; // Keep this just in case

function App() {
  const { role } = useAuth();
  return (
    <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/403" element={<Forbidden />} />
        <Route path="/dev-tokens" element={<DevTokens />} />

        {/* Redirect root based on role */}
        <Route path="/" element={
          <RoleGuard>
            {role === 'mentor' ? <Navigate to="/dashboard" replace /> : <Navigate to="/me/attendance" replace />}
          </RoleGuard>
        } />

        {/* Protected Mentor Routes */}
        <Route element={
          <RoleGuard allowedRoles={['mentor']}>
            <MainLayout />
          </RoleGuard>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<MarkAttendance />} />
          <Route path="/history" element={<StudentHistory />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/upload" element={<UploadCSV />} />
        </Route>

        {/* Protected Student Routes */}
        <Route element={
          <RoleGuard allowedRoles={['student']}>
            <MainLayout />
          </RoleGuard>
        }>
          <Route path="/me/attendance" element={<MyAttendance />} />
          <Route path="/me/upcoming" element={<UpcomingSessions />} />
          <Route path="/me/materials" element={<StudentMaterials />} />
        </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
