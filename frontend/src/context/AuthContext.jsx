// WAYPOINT — Maritime Route Intelligence | AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  loginUser, 
  registerUser, 
  demoAuth, 
  logoutUser, 
  updateUserProfile,
  auth 
} from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("waypoint_profile");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      localStorage.setItem("waypoint_profile", JSON.stringify(userProfile));
    } else {
      localStorage.removeItem("waypoint_profile");
    }
  }, [userProfile]);

  const login = async (email, password) => {
    setLoading(true);
    const res = await loginUser(email, password);
    setLoading(false);
    if (res.success) {
      setUserProfile(res.profile);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const signup = async (name, org, email, password, role) => {
    setLoading(true);
    const res = await registerUser(name, org, email, password, role);
    setLoading(false);
    if (res.success) {
      setUserProfile(res.profile);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const demoLogin = async (role) => {
    setLoading(true);
    const res = await demoAuth(role);
    setLoading(false);
    if (res.success) {
      setUserProfile(res.profile);
      return { success: true };
    }
    return { success: false };
  };

  const logout = async () => {
    await logoutUser();
    setUserProfile(null);
  };

  const updateProfileData = async (data) => {
    if (!userProfile?.uid) return;
    const updated = { ...userProfile, ...data };
    setUserProfile(updated);
    await updateUserProfile(userProfile.uid, data);
  };

  const value = {
    userProfile,
    currentRole: userProfile?.role || 'shipper',
    isLoggedIn: !!userProfile,
    loading,
    login,
    signup,
    demoLogin,
    logout,
    updateProfileData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
