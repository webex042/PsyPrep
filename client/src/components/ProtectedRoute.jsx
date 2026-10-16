import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-[#66645F] font-mono text-xs">
        <div className="w-8 h-8 border-2 border-[#D96836] border-t-transparent rounded-full animate-spin mb-3" />
        <p>Loading PsyPrep Session...</p>
      </div>
    );
  }

  // Teacher console role restriction
  if (requiredRole === 'teacher') {
    if (!isAuthenticated || user?.role !== 'teacher') {
      return <Navigate to="/" replace />;
    }
  }

  // All student mock tests and general routes are open access
  return children;
}
