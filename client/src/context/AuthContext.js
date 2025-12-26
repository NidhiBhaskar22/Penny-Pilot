import React, { createContext, useState, useEffect, useContext } from "react";
import axiosClient from "../api/axiosClient";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    const res = await axiosClient.post("/api/auth/register", data);
    return res.data;
  };

  const login = async (credentials) => {
    const res = await axiosClient.post("/api/auth/login", credentials);
    const { token, user } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  };

  const completeProfile = async (data) => {
    const res = await axiosClient.post("/api/auth/complete-profile", data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, register, login, completeProfile, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ✅ This fixes the error in ProtectedRoute.js
export const useAuth = () => {
  return useContext(AuthContext);
};
