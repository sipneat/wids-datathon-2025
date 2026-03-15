import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Intake from "./pages/Intake";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import Resources from "./pages/Resources";
import Housing from "./pages/Housing";
import Insurance from "./pages/Insurance";
import Chatbot from "./pages/Chatbot";
import { auth } from "./services/firebase";
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from './services/routes';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);

      if (user) {
        setCurrentUser(user);
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile({ ...profile, uid: user.uid, email: user.email });
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleIntakeComplete = (profile) => {
    if (!currentUser) return;
    setUserProfile({ ...profile, uid: currentUser.uid, email: currentUser.email });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-green-50 to-blue-50 flex items-center justify-center">
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
            currentUser
              ? <Navigate to={userProfile ? "/dashboard" : "/intake"} />
              : <Login />
          } 
        />
        <Route 
          path="/intake" 
          element={
            currentUser
              ? (userProfile ? <Navigate to="/dashboard" /> : <Intake onComplete={handleIntakeComplete} />)
              : <Navigate to="/login" />
          }
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
          path="/assistant" 
          element={
            userProfile ? <Chatbot userProfile={userProfile} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/" 
          element={
            <Navigate to={currentUser ? (userProfile ? "/dashboard" : "/intake") : "/login"} />
          }
        />
      </Routes>
    </Router>
  );
}