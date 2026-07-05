import React, { useState, useEffect } from 'react';
import MarvelBackground from './components/MarvelBackground';
import SpaceBackground from './components/SpaceBackground';
import MatrixBackground from './components/MatrixBackground';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import AppDownloadPrompt from './components/AppDownloadPrompt';

export default function App() {
  const [portal, setPortal] = useState<'student' | 'admin'>('student');
  const [theme, setTheme] = useState<'marvel' | 'space' | 'matrix'>('marvel');

  useEffect(() => {
    const savedTheme = localStorage.getItem('jamal_theme') as 'marvel' | 'space' | 'matrix';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: 'marvel' | 'space' | 'matrix') => {
    setTheme(newTheme);
    localStorage.setItem('jamal_theme', newTheme);
  };

  // URL query parameter check & LocalStorage check to isolate admin area
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const isAdminParam = queryParams.get('admin') === 'true' || queryParams.get('role') === 'admin' || queryParams.get('portal') === 'admin';
    const isSavedAdmin = localStorage.getItem('jamal_admin_auth') === 'true';

    if (isAdminParam || isSavedAdmin) {
      setPortal('admin');
    } else {
      setPortal('student');
    }
  }, []);

  const handleAdminLogout = () => {
    localStorage.removeItem('jamal_admin_auth');
    // Keep or set the admin query param so we always stay on the admin panel login screen
    const url = new URL(window.location.href);
    url.searchParams.set('admin', 'true');
    url.searchParams.delete('role');
    url.searchParams.delete('portal');
    window.history.replaceState({}, '', url.toString());
    setPortal('admin');
  };

  const handleStudentLogout = () => {
    localStorage.removeItem('jamal_student');
    window.location.reload();
  };

  return (
    <div className={`min-h-screen relative font-sans text-white ${theme === 'matrix' ? 'font-mono' : ''}`}>
      {theme === 'marvel' && <MarvelBackground />}
      {theme === 'space' && <SpaceBackground />}
      {theme === 'matrix' && <MatrixBackground />}
      
      {portal === 'student' && <AppDownloadPrompt />}
      
      {portal === 'student' && (
        <StudentDashboard onLogout={handleStudentLogout} currentTheme={theme} onThemeChange={handleThemeChange} />
      )}
      {portal === 'admin' && (
        <AdminDashboard onLogout={handleAdminLogout} />
      )}
    </div>
  );
}
