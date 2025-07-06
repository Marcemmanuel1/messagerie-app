import { useState, useRef, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiMail, FiLock, FiCamera, FiArrowRight } from "react-icons/fi";
import { motion } from "framer-motion";

export default function Inscription() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Clean up the preview URL when the component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!file.type.match('image.*')) {
        setError("Only image files (JPEG, PNG, GIF) are allowed.");
        return;
      }

      if (file.size > 15 * 1024 * 1024) { // 15MB limit
        setError("Image size must not exceed 15MB.");
        return;
      }

      setAvatar(file);
      setPreview(URL.createObjectURL(file));
      setError(""); // Clear any previous errors
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(""); // Clear previous errors

    // Basic client-side validation
    if (!form.name || !form.email || !form.password) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("password", form.password);
      if (avatar) formData.append("avatar", avatar); // Append avatar if selected

      const response = await fetch("https://messagerie-nbbh.onrender.com/api/register", {
        method: "POST",
        body: formData,
        credentials: "include", // Important for sending cookies, if any
      });

      // Check content type before parsing as JSON
      const contentType = response.headers.get("content-type");
      const data = contentType?.includes("application/json")
        ? await response.json()
        : {};

      if (!response.ok) {
        const msg = data?.message || "Registration failed.";
        throw new Error(msg);
      }

      // Si le backend retourne un token et un user :
      if (data && data.success && data.token) {
        localStorage.setItem("token", data.token); // Stocke le token comme pour le login
        if (data.user) {
          localStorage.setItem("currentUser", JSON.stringify(data.user));
        }
        navigate("/page"); // Redirige directement vers la page principale
      } else {
        // Sinon, redirige vers la page de connexion
        navigate("/");
      }
    } catch (err) {
      let message = "An error occurred during registration.";
      if (err instanceof Error) {
        // Specific error messages for common issues
        if (err.message.includes("File too large")) {
          message = "The image is too large (max 5MB allowed)."; // Note: this might be a backend limit, client-side is 15MB
        } else if (err.message.includes("CORS")) {
          message = "CORS error: access denied. Check backend configuration.";
        } else {
          message = err.message;
        }
      }
      console.error("Registration error:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
      >
        <div className="text-center mb-8">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
          >
            Create an Account
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 mt-2"
          >
            Join our community and start your journey
          </motion.p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar upload section */}
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
                    alt="Avatar Preview"
                    className="w-full h-full object-cover"
                    onError={() => setPreview("")} // Fallback if image fails to load
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
                accept="image/jpeg, image/png, image/gif"
                className="hidden"
              />
            </motion.div>
            <p className="text-xs text-gray-400 mt-2">Profile picture (optional - max 15MB)</p>
          </div>

          {/* Name input */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <label htmlFor="name" className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                <FiUser />
              </div>
              <input
                type="text"
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="Your Name"
              />
            </div>
          </motion.div>

          {/* Email input */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                <FiMail />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="your@email.com"
              />
            </div>
          </motion.div>

          {/* Password input */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                <FiLock />
              </div>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="••••••••"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
          </motion.div>

          {/* Submit button */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition flex items-center justify-center shadow-md hover:shadow-lg ${loading ? "opacity-80 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </>
              ) : (
                <>
                  Sign Up <FiArrowRight className="ml-2" />
                </>
              )}
            </button>
          </motion.div>
        </form>

        {/* Login link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <a
              href="/" // Assuming "/" is the path to your login page
              className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Log In
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}