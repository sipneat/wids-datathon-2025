import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Intake from "./pages/Intake";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import Resources from "./pages/Resources";
import Housing from "./pages/Housing";
import Schools from "./pages/Schools";
import Insurance from "./pages/Insurance";

export default function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved user profile on mount
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }
    setIsLoading(false);
  }, []);

  const handleIntakeComplete = (profile) => {
    setUserProfile(profile);
    localStorage.setItem('userProfile', JSON.stringify(profile));
  };

  const handleLogin = (profile) => {
    setUserProfile(profile);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            userProfile ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/intake" 
          element={<Intake onComplete={handleIntakeComplete} />} 
        />
        <Route 
          path="/dashboard" 
          element={
            userProfile ? <Dashboard userProfile={userProfile} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/housing" 
          element={
            userProfile ? <Housing userProfile={userProfile} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/schools" 
          element={
            userProfile ? <Schools userProfile={userProfile} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/community" 
          element={
            userProfile ? <Community userProfile={userProfile} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/resources" 
          element={
            userProfile ? <Resources userProfile={userProfile} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/insurance" 
          element={
            userProfile ? <Insurance userProfile={userProfile} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/" 
          element={<Navigate to={userProfile ? "/dashboard" : "/login"} />} 
        />
      </Routes>
    </Router>
  );
}