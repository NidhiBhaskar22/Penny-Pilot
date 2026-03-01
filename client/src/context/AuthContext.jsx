import React, { createContext, useState, useEffect, useContext } from "react";
import axiosClient from "../api/axiosClient";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAuthed = !!user;
  const hydrated = !loading;

  // Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const register = async (data) => {
    const res = await axiosClient.post("/auth/register", data);
    const { token, user } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    return res.data;
  };

  const login = async (credentials) => {
    const res = await axiosClient.post("/auth/login", credentials);
    const { token, user } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  };

  const loginWithGoogle = async (idToken) => {
    const res = await axiosClient.post("/auth/google", { idToken });
    const { token, user } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  };

  const completeProfile = async (data) => {
    const res = await axiosClient.post("/auth/complete-profile", data);
    const { token, user } = res.data;
    if (token) {
      localStorage.setItem("token", token);
    }
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        register,
        login,
        loginWithGoogle,
        completeProfile,
        logout,
        loading,
        isAuthed,
        hydrated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ✅ This fixes the error in ProtectedRoute.js
export const useAuth = () => {
  return useContext(AuthContext);
};
