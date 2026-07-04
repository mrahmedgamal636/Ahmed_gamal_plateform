import React, { useState, useEffect } from 'react';
import MarvelBackground from './components/MarvelBackground';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [portal, setPortal] = useState<'student' | 'admin'>('student');

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
    // Clear admin query params from URL safely
    const url = new URL(window.location.href);
    url.searchParams.delete('admin');
    url.searchParams.delete('role');
    url.searchParams.delete('portal');
    window.history.replaceState({}, '', url.toString());
    setPortal('student');
  };

  const handleStudentLogout = () => {
    localStorage.removeItem('jamal_student');
    window.location.reload();
  };

  return (
    <div className="min-h-screen relative font-sans text-white">
      {/* Dynamic Futuristic Space Background */}
      <MarvelBackground />

      {portal === 'student' && (
        <StudentDashboard onLogout={handleStudentLogout} />
      )}

      {portal === 'admin' && (
        <AdminDashboard onLogout={handleAdminLogout} />
      )}
    </div>
  );
}
