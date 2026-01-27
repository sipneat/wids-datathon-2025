import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Your web app's Firebase configuration
// Replace these with your actual Firebase config values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Backend API URL
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper function to get auth token
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
};

// Auth functions - Frontend only handles authentication
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Firestore data functions - all go through backend API

/**
 * Fetch user profile from Firestore via backend
 */
export const getUserProfile = async (userId) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/user/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Fetch user's intake responses from Firestore via backend
 */
export const getUserIntakeResponses = async (userId) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/user/intake/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch intake responses: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching intake responses:', error);
    throw error;
  }
};

/**
 * Update user action status (for tracking priority actions)
 */
export const updateActionStatus = async (userId, actionId, status, notes = '') => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/user/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        actionId,
        status, // 'not-started', 'in-progress', 'completed'
        notes,
        updatedAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update action status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating action status:', error);
    throw error;
  }
};

/**
 * Get user's action statuses
 */
export const getUserActions = async (userId) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/user/actions/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user actions: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user actions:', error);
    throw error;
  }
};

export { auth };
