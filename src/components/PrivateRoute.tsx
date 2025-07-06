import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirection

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate hook

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token'); // Correction ici

        if (!token) {
          // If no token exists, the user is not logged in
          setIsLoggedIn(false);
          setIsLoading(false);
          // Redirect to login page immediately if no token
          navigate("/"); // Assuming "/" is your login/home page
          return;
        }

        const response = await fetch("https://messagerie-nbbh.onrender.com/api/check-auth", {
          method: "GET", // Use GET method for checking auth
          // IMPORTANT: Remove credentials: "include" as it's for cookie-based sessions.
          // JWTs are sent via the Authorization header.
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // Pas besoin de changer ici
          },
        });

        const contentType = response.headers.get("content-type");
        const data = contentType?.includes("application/json") ? await response.json() : null;

        if (!response.ok || !data.isAuthenticated) {
          // If the response is not OK, or isAuthenticated is false
          setIsLoggedIn(false);
          localStorage.removeItem('token'); // Correction ici
          localStorage.removeItem('currentUser'); // Clear any stored user data
          // Redirect to login page
          navigate("/");
        } else {
          setIsLoggedIn(true);
          // Optionally, update currentUser in localStorage with fresh data if needed
          // For instance, if user status or avatar might change while logged in
          if (data.user) {
             localStorage.setItem('currentUser', JSON.stringify(data.user));
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Authentication check error (PrivateRoute):", message);
        setIsLoggedIn(false);
        localStorage.removeItem('token'); // Correction ici
        localStorage.removeItem('currentUser');
        navigate("/"); // Redirect on error
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]); // Add navigate to dependency array

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

  return isLoggedIn ? children : (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <span className="text-gray-500 mb-2">Vous devez être connecté pour accéder à cette page.</span>
        <a href="/" className="text-indigo-600 underline hover:text-indigo-800 transition-colors">Retour à la page de connexion</a>
      </div>
    </div>
  );
};

export default PrivateRoute;