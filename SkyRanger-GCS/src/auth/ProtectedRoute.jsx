import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";

/**
 * Wrap any route that requires a logged-in user.
 * If the user is not authenticated, they are sent to /login.
 */
export const ProtectedRoute = () => {
  const { token } = useAuth();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};
