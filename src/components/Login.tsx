import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiArrowRight, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

type FormData = {
  email: string;
  password: string;
};

type ApiError = {
  message: string;
  errors?: Record<string, string[]>;
};

export default function Login() {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<FormData> & { global?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Veuillez entrer un email valide";
    }
    
    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post("https://messagerie-nbbh.onrender.com/api/login", formData);
      setSuccess(true);
      
      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
      }

      if (response.data.user) {
        localStorage.setItem("userData", JSON.stringify(response.data.user));
      }

      setTimeout(() => {
        navigate("/page");
      }, 1500);

    } catch (err) {
      console.error("Erreur de connexion:", err);
      
      if (axios.isAxiosError(err) && err.response) {
        const errorData = err.response.data as ApiError;
        
        if (errorData.errors) {
          const serverErrors: Partial<FormData> = {};
          Object.entries(errorData.errors).forEach(([field, messages]) => {
            if (field in formData) {
              serverErrors[field as keyof FormData] = messages.join(", ");
            }
          });
          setErrors({ ...serverErrors, global: errorData.message });
        } else {
          setErrors({ global: errorData.message || "Erreur lors de la connexion" });
        }
      } else {
        setErrors({ global: "Une erreur réseau est survenue" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
      >
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4"
              >
                <FiCheck className="h-6 w-6 text-green-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Connexion réussie !</h2>
              <p className="text-gray-600 mb-6">Vous allez être redirigé vers votre espace...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5 }}
                  className="h-2 rounded-full bg-indigo-600"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl font-bold text-gray-800 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
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

              {errors.global && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.global}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Champ Email */}
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: 0.3 }}
                >
                  <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">
                    Adresse email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FiMail />
                    </div>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border ${
                        errors.email ? "border-red-300" : "border-gray-200"
                      } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-gray-50 focus:bg-white`}
                      placeholder="votre@email.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </motion.div>

                {/* Champ Mot de passe */}
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: 0.4 }}
                >
                  <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-1">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FiLock />
                    </div>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border ${
                        errors.password ? "border-red-300" : "border-gray-200"
                      } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-gray-50 focus:bg-white`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </motion.div>

                {/* Bouton de connexion */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.5 }}
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition flex items-center justify-center shadow-md hover:shadow-lg ${
                      loading ? "opacity-80 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        Se connecter <FiArrowRight className="ml-2" />
                      </>
                    )}
                  </button>
                </motion.div>
              </form>

              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.6 }} 
                className="mt-6 text-center"
              >
                <p className="text-sm text-gray-500">
                  Pas encore de compte ?{" "}
                  <a 
                    href="/inscription" 
                    className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    S'inscrire
                  </a>
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}