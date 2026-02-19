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
import Employment from "./pages/Employment";
import { auth } from "./services/firebase";
import { onAuthStateChanged } from 'firebase/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Demo mode (no Firebase configured): don't block the UI behind auth.
    if (!auth) {
      const saved = localStorage.getItem('userProfile');
      if (saved) {
        try {
          setUserProfile(JSON.parse(saved));
        } catch {
          // ignore parse errors
        }
      }
      // Provide a minimal demo profile so protected routes render.
      setUserProfile((prev) => prev || {
        name: 'Demo User',
        hasChildren: true,
        needsHousing: true,
        hasInsurance: true
      });
      setIsLoading(false);
      return;
    }

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, try to load their profile from backend
        try {
          const idToken = await user.getIdToken();
          const response = await fetch(`${API_BASE_URL}/user/profile/${user.uid}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const profile = await response.json();
            setUserProfile({ ...profile, uid: user.uid, email: user.email });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        // User is signed out
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
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
          path="/employment" 
          element={
            userProfile ? <Employment userProfile={userProfile} /> : <Navigate to="/login" />
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