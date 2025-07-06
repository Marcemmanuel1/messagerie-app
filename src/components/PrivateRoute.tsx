import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

interface PrivateRouteProps {
  children: React.ReactElement;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      setIsLoggedIn(false);
      setIsLoading(false);
      return;
    }

    fetch("https://messagerie-nbbh.onrender.com/api/check-auth", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          // Token invalide ou expiré, on supprime le token
          localStorage.removeItem("token");
          setIsLoggedIn(false);
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setIsLoggedIn(data.isAuthenticated);
        setIsLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    // Tu peux remplacer par un spinner si tu veux
    return <div>Chargement...</div>;
  }

  // Si connecté, on affiche les enfants, sinon on redirige vers la page d'accueil (ou login)
  return isLoggedIn ? children : <Navigate to="/" replace />;
};

export default PrivateRoute;
