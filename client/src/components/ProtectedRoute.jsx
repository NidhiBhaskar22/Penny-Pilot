// ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthed, hydrated } = useAuth();
  const location = useLocation();

  if (!hydrated) return null; // or a centered spinner/skeleton

  return isAuthed ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}
