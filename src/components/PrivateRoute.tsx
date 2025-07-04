import React from 'react';
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/check-auth", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setIsLoggedIn(data.isAuthenticated);
        setIsLoading(false);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Erreur vérification auth (PrivateRoute):", message);
        setIsLoggedIn(false);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
          <span className="text-gray-500">Chargement...</span>
        </div>
      </div>
    );
  }

  return isLoggedIn ? children : <Navigate to="/connexion" replace />;
};

export default PrivateRoute;
