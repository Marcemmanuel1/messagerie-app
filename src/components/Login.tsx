import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiArrowRight } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Gestion des changements de champ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("https://messagerie-nbbh.onrender.com/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const contentType = response.headers.get("content-type");
      const data = contentType?.includes("application/json") ? await response.json() : null;

      if (!response.ok) {
        const message = data?.message || "Échec de la connexion. Veuillez réessayer.";
        throw new Error(message);
      }

      if (data && data.success && data.token) {
        localStorage.setItem("token", data.token); // <-- Correction ici
        if (data.user) {
          localStorage.setItem("currentUser", JSON.stringify(data.user));
        }
        navigate("/page");
      } else {
        throw new Error("Connexion réussie mais jeton d'authentification manquant.");
      }
    } catch (err) {
      let msg = "Une erreur est survenue lors de la connexion.";
      if (err instanceof Error) {
        if (err.message.includes("Identifiants incorrects") || err.message.includes("401")) {
          msg = "Email ou mot de passe incorrect.";
        } else {
          msg = err.message;
        }
      }
      setError(msg);
      console.error("Erreur de connexion:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
      >
        {/* Titre */}
        <div className="text-center mb-8">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
          >
            Connexion
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 mt-2"
          >
            Accédez à votre espace personnel
          </motion.p>
        </div>

        {/* Message d'erreur */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error-message"
              initial={{ opacity: 0, scale: 0.9, height: 0 }}
              animate={{ opacity: 1, scale: 1, height: "auto" }}
              exit={{ opacity: 0, scale: 0.9, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center overflow-hidden"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">
              Adresse email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <FiMail />
              </div>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-all duration-200"
                placeholder="votre@email.com"
              />
            </div>
          </motion.div>

          {/* Mot de passe */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <FiLock />
              </div>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-all duration-200"
                placeholder="••••••••"
              />
            </div>
          </motion.div>

          {/* Bouton de connexion */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                loading ? "opacity-80 cursor-not-allowed" : "hover:from-indigo-700 hover:to-purple-700"
              }`}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center"
                  >
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Connexion...
                  </motion.div>
                ) : (
                  <motion.div
                    key="normal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center"
                  >
                    Se connecter <FiArrowRight className="ml-2" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </motion.div>
        </form>

        {/* Lien vers l'inscription */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-500">
            Pas encore de compte ?{" "}
            <a href="/inscription" className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
              S'inscrire
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
