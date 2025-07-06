import { useState, useRef, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiMail, FiLock, FiCamera, FiArrowRight, FiCheck } from "react-icons/fi";
import { motion } from "framer-motion";
import axios from "axios";

type FormData = {
  name: string;
  email: string;
  password: string;
};

type ApiError = {
  message: string;
  errors?: Record<string, string[]>;
};

export default function Inscription() {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    password: ""
  });

  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [errors, setErrors] = useState<Partial<FormData> & { global?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Nettoyer l'URL Blob pour éviter les fuites mémoire
  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Calculer la force du mot de passe
  useEffect(() => {
    if (!form.password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    // Longueur minimale
    if (form.password.length >= 6) strength += 1;
    // Contient un chiffre
    if (/\d/.test(form.password)) strength += 1;
    // Contient une majuscule
    if (/[A-Z]/.test(form.password)) strength += 1;
    // Contient un caractère spécial
    if (/[^A-Za-z0-9]/.test(form.password)) strength += 1;

    setPasswordStrength(strength);
  }, [form.password]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Effacer l'erreur du champ lorsqu'il est modifié
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!form.name.trim()) {
      newErrors.name = "Le nom est requis";
    } else if (form.name.length < 2) {
      newErrors.name = "Le nom doit contenir au moins 2 caractères";
    }
    
    if (!form.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Veuillez entrer un email valide";
    }
    
    if (!form.password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (form.password.length < 6) {
      newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Vérification du type de fichier
      if (!file.type.match('image.(jpeg|png|gif|webp)')) {
        setErrors({ global: "Seuls les fichiers image (JPEG, PNG, GIF, WEBP) sont autorisés" });
        return;
      }

      // Vérification de la taille
      if (file.size > 15 * 1024 * 1024) {
        setErrors({ global: "L'image ne doit pas dépasser 15MB" });
        return;
      }

      setAvatar(file);
      setPreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, global: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("password", form.password);
      if (avatar) formData.append("avatar", avatar);

      const response = await axios.post("https://messagerie-nbbh.onrender.com/api/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      // Gestion de la réponse réussie
      setSuccess(true);
      
      // Stocker le token dans le localStorage
      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
      }

      // Redirection après un délai
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err) {
      console.error("Erreur d'inscription:", err);
      
      if (axios.isAxiosError(err) && err.response) {
        const errorData = err.response.data as ApiError;
        
        if (errorData.errors) {
          // Gestion des erreurs de validation du serveur
          const serverErrors: Partial<FormData> = {};
          Object.entries(errorData.errors).forEach(([field, messages]) => {
            if (field in form) {
              serverErrors[field as keyof FormData] = messages.join(", ");
            }
          });
          setErrors({ ...serverErrors, global: errorData.message });
        } else {
          setErrors({ global: errorData.message || "Erreur lors de l'inscription" });
        }
      } else {
        setErrors({ global: "Une erreur réseau est survenue" });
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500"
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
      >
        {success ? (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4"
            >
              <FiCheck className="h-6 w-6 text-green-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Inscription réussie !</h2>
            <p className="text-gray-600 mb-6">Vous allez être redirigé vers la page d'accueil...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2 }}
                className="h-2 rounded-full bg-indigo-600"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <motion.h2
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold text-gray-800 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
              >
                Créer un compte
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-gray-500 mt-2"
              >
                Rejoignez notre communauté et commencez votre voyage
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
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <motion.div 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }} 
                  className="relative group"
                >
                  <div
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center overflow-hidden cursor-pointer border-4 border-white shadow-lg"
                    onClick={() => fileInput.current?.click()}
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          setPreview("");
                        }}
                      />
                    ) : (
                      <FiUser className="text-gray-400 text-3xl" />
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2 group-hover:bg-indigo-700 transition shadow-md">
                    <FiCamera className="text-white text-sm" />
                  </div>
                  <input
                    type="file"
                    ref={fileInput}
                    onChange={handleAvatarChange}
                    accept="image/jpeg, image/png, image/gif, image/webp"
                    className="hidden"
                  />
                </motion.div>
                <p className="text-xs text-gray-400 mt-2">Photo de profil (optionnel - max 15MB)</p>
              </div>

              {/* Nom */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.3 }}
              >
                <label htmlFor="name" className="block text-sm font-medium text-gray-600 mb-1">
                  Nom complet
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiUser />
                  </div>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border ${
                      errors.name ? "border-red-300" : "border-gray-200"
                    } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-gray-50 focus:bg-white`}
                    placeholder="Votre nom"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </motion.div>

              {/* Email */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.4 }}
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
                    value={form.email}
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

              {/* Mot de passe */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.5 }}
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
                    value={form.password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border ${
                      errors.password ? "border-red-300" : "border-gray-200"
                    } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-gray-50 focus:bg-white`}
                    placeholder="••••••••"
                  />
                </div>
                <div className="mt-2">
                  <div className="flex space-x-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          i < passwordStrength
                            ? passwordStrengthColors[passwordStrength - 1]
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {passwordStrength === 0 && "Très faible"}
                    {passwordStrength === 1 && "Faible"}
                    {passwordStrength === 2 && "Moyen"}
                    {passwordStrength === 3 && "Fort"}
                    {passwordStrength === 4 && "Très fort"}
                  </p>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </motion.div>

              {/* Bouton */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.6 }}
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
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Inscription en cours...
                    </>
                  ) : (
                    <>
                      S'inscrire <FiArrowRight className="ml-2" />
                    </>
                  )}
                </button>
              </motion.div>
            </form>

            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.7 }} 
              className="mt-6 text-center"
            >
              <p className="text-sm text-gray-500">
                Vous avez déjà un compte ?{" "}
                <a 
                  href="/" 
                  className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  Connectez-vous
                </a>
              </p>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}