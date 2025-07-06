import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch("https://messagerie-nbbh.onrender.com/api/check-auth", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setIsLoggedIn(data.isAuthenticated);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoggedIn(false);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <div>Chargement...</div>; // Ou un spinner sympa
  }

  return isLoggedIn ? children : <Navigate to="/" replace />;
};

export default PrivateRoute;
