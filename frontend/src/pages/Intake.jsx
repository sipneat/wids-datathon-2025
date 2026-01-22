import React, { useEffect } from 'react';
import { IntakeForm } from '../components/IntakeForm';

export default function Intake({ onComplete }) {
  useEffect(() => {
    // Generate and store a unique user ID if one doesn't exist
    if (!localStorage.getItem('userId')) {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', userId);
    }
  }, []);

  const handleIntakeComplete = (profile) => {
    // Store profile and responses in localStorage
    localStorage.setItem('userProfile', JSON.stringify(profile));
    
    if (onComplete) {
      onComplete(profile);
    }
  };

  return <IntakeForm onComplete={handleIntakeComplete} />;
}