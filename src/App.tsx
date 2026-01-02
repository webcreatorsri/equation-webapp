import React, { useEffect, useState, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import ProfessionalEquationBuilder from './components/ProfessionalEquationBuilder';
import Login from './components/Login';
import SignUp from './components/SignUp';
import EquationGallery from './components/EquationGallery';
import { Loader2 } from 'lucide-react';

// ProtectedRoute wrapper - for authenticated users only
const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Redirect unauthenticated users to login with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// PublicRoute wrapper - for non-authenticated users only
const PublicRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (user) {
    // Redirect authenticated users to equation builder
    return <Navigate to="/equation-builder" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* Public Routes - only accessible when NOT logged in */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/signup" 
            element={
              <PublicRoute>
                <SignUp />
              </PublicRoute>
            } 
          />

          {/* Protected Routes - only accessible when logged in */}
          <Route
            path="/equation-builder"
            element={
              <ProtectedRoute>
                <ProfessionalEquationBuilder />
              </ProtectedRoute>
            }
          />

          {/* Gallery Route - Protected */}
          <Route
            path="/gallery"
            element={
              <ProtectedRoute>
                <EquationGallery />
              </ProtectedRoute>
            }
          />

          {/* Default route - redirect to equation builder */}
          <Route path="/" element={<Navigate to="/equation-builder" replace />} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/equation-builder" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;