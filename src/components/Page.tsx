import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiMessageSquare, FiSettings, FiLogOut, FiUser, FiSearch, 
  FiFilter, FiChevronRight, FiLink, FiImage, FiMail, 
  FiPhone, FiMapPin, FiEdit, FiSave, FiX, 
  FiPaperclip, FiVideo, FiMenu, FiChevronLeft 
} from "react-icons/fi";
import { BsThreeDotsVertical, BsCheckAll } from "react-icons/bs";
import { IoMdSend } from "react-icons/io";
import io, { Socket } from "socket.io-client";
import axios from "axios";

// Types
type User = {
  id: number;
  name: string;
  email: string;
  avatar: string;
  status: string;
  bio?: string;
  phone?: string;
  location?: string;
};

type Conversation = {
  id: number;
  other_user_id: number;
  other_user_name: string;
  other_user_avatar: string;
  other_user_status: string;
  other_user_email: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
};

type Message = {
  id: number;
  content: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  created_at: string;
  sender_id: number;
  sender_name: string;
  sender_avatar: string;
  is_read: boolean;
  conversationId?: number;
};

const Page = () => {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<User | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [media] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [error, setError] = useState("");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileConversationList, setShowMobileConversationList] = useState(false);
  const [showMobileUserDetails, setShowMobileUserDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket with JWT token
  const initializeSocket = useCallback(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/");
      return;
    }

    socketRef.current = io("https://messagerie-nbbh.onrender.com", {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [navigate]);

  // Check authentication and load initial data
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const response = await axios.get("https://messagerie-nbbh.onrender.com/api/check-auth", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.data.isAuthenticated) {
          navigate("/");
          return;
        }

        setUser(response.data.user);
        initializeSocket();
        await fetchInitialData();
      } catch (err) {
        console.error("Auth check error:", err);
        navigate("/");
      }
    };

    checkAuth();
  }, [navigate, initializeSocket]);

  // Setup socket listeners
  useEffect(() => {
    if (!socketRef.current || !user) return;

    const socket = socketRef.current;

    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => [...prev, message]);
        if (message.sender_id !== user.id) {
          socket.emit("mark-as-read", { conversationId: message.conversationId });
        }
      }

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === message.conversationId
            ? {
                ...conv,
                last_message: message.content || "Fichier",
                last_message_time: message.created_at,
                unread_count: message.sender_id === user.id ? 0 : conv.unread_count + 1,
              }
            : conv
        )
      );
    };

    const handleMessageSent = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleConversationUpdated = (conversation: Conversation) => {
      setConversations((prev) =>
        prev.map((conv) => (conv.id === conversation.id ? conversation : conv))
      );

      const totalUnread = conversations.reduce(
        (acc, conv) => acc + (conv.id === conversation.id ? conversation.unread_count : conv.unread_count),
        0
      );
      setUnreadCount(totalUnread);
    };

    const handleUserStatusChanged = ({ userId, status }: { userId: number; status: string }) => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
      setConversations((prev) =>
        prev.map((conv) =>
          conv.other_user_id === userId ? { ...conv, other_user_status: status } : conv
        )
      );
      if (selectedConversation?.id === userId) {
        setSelectedConversation((prev) => (prev ? { ...prev, status } : null));
      }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("message-sent", handleMessageSent);
    socket.on("conversation-updated", handleConversationUpdated);
    socket.on("user-status-changed", handleUserStatusChanged);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("message-sent", handleMessageSent);
      socket.off("conversation-updated", handleConversationUpdated);
      socket.off("user-status-changed", handleUserStatusChanged);
    };
  }, [user, conversationId, conversations, selectedConversation]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      const [usersResponse, conversationsResponse] = await Promise.all([
        axios.get("https://messagerie-nbbh.onrender.com/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("https://messagerie-nbbh.onrender.com/api/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setUsers(usersResponse.data.users);
      setConversations(conversationsResponse.data.conversations);
      
      const count = conversationsResponse.data.conversations.reduce(
        (acc: number, conv: Conversation) => acc + (conv.unread_count || 0),
        0
      );
      setUnreadCount(count);
    } catch (err) {
      console.error("Data loading error:", err);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile data
  const fetchProfileData = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("authToken");

    try {
      const response = await axios.get("https://messagerie-nbbh.onrender.com/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.data.success || !response.data.user) {
        throw new Error(response.data.message || "Failed to fetch profile");
      }

      setUser(response.data.user);
      setUserDetails(response.data.user);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Profile fetch error");
      } else {
        setError("An unknown error occurred");
      }
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  // UI handlers
  const handleShowMessages = () => {
    setShowProfile(false);
    setShowNewConversation(false);
    setShowMobileSidebar(false);
  };

  const handleShowProfile = () => {
    setShowProfile(true);
    setShowNewConversation(false);
    setShowMobileSidebar(false);
    fetchProfileData();
  };

  const handleNewConversation = () => {
    setShowNewConversation(true);
    setShowProfile(false);
    setSelectedConversation(null);
    setShowMobileSidebar(false);
  };

  const handleSelectUser = (user: User) => {
    setSelectedConversation(user);
    setShowProfile(false);
    setShowNewConversation(false);
    setShowMobileConversationList(false);
  };

  // Logout handler
  const handleLogout = async () => {
    setLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      await axios.post("https://messagerie-nbbh.onrender.com/api/logout", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      socketRef.current?.disconnect();
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Message handlers
  const sendMessage = async () => {
    if (input.trim() === "" || !conversationId || !socketRef.current) return;

    const messageContent = input.trim();
    setInput("");

    socketRef.current.emit(
      "send-message",
      { conversationId, content: messageContent },
      (response: { success: boolean; message: Message }) => {
        if (!response.success) {
          console.error("Message send error");
        }
      }
    );
  };

  // Profile handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setUserDetails((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);

      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const token = localStorage.getItem("authToken");

    const formData = new FormData();
    if (userDetails) {
      formData.append("name", userDetails.name);
      formData.append("bio", userDetails.bio || "");
      formData.append("phone", userDetails.phone || "");
      formData.append("location", userDetails.location || "");
    }
    if (avatarFile) formData.append("avatar", avatarFile);

    try {
      const response = await axios.put(
        "https://messagerie-nbbh.onrender.com/api/profile",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setUserDetails(response.data.user);
        setUser(response.data.user);
        setAvatarFile(null);
        setAvatarPreview("");
        setIsEditing(false);
      } else {
        setError(response.data.message || "Update failed");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Profile update error");
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // Render message content
  const renderMessageContent = (msg: Message) => {
    if (msg.fileUrl) {
      if (msg.fileType?.startsWith("image/")) {
        return (
          <div className="relative group">
            <img
              src={`https://messagerie-nbbh.onrender.com${msg.fileUrl}`}
              alt="Fichier image"
              className="max-w-xs md:max-w-md rounded-lg cursor-pointer"
              onClick={() =>
                window.open(`https://messagerie-nbbh.onrender.com${msg.fileUrl}`, "_blank")
              }
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                Ouvrir en plein écran
              </span>
            </div>
          </div>
        );
      }
      return (
        <a
          href={`https://messagerie-nbbh.onrender.com${msg.fileUrl}`}
          download
          className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <FiPaperclip className="mr-2" />
          {msg.fileUrl.split("/").pop()}
        </a>
      );
    }
    return <p className="whitespace-pre-wrap">{msg.content}</p>;
  };

  // Filtered data
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredConversations = conversations.filter((conv) =>
    conv.other_user_name.toLowerCase().includes(search.toLowerCase())
  );

  const links = [
    { url: "https://example.com/project", title: "Lien vers le projet", image: "/images/car.jpg" },
    { url: "https://example.com/documentation", title: "Documentation technique", image: "/images/document.jpg" },
  ];

  // Mobile handlers
  const handleBackToConversations = () => {
    setShowMobileConversationList(true);
    setSelectedConversation(null);
  };

  const handleBackToChat = () => {
    setShowMobileUserDetails(false);
  };

  if (showProfile) {
    return (
      <div className="flex w-full min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-white z-50 p-3 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="text-gray-600"
          >
            <FiMenu size={24} />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Mon Profil</h1>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>

        {/* Sidebar - Mobile */}
        {showMobileSidebar && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-4">
              <div className="flex flex-col h-full">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-100 mx-auto mt-4">
                  {user ? (
                    <img
                      className="w-full h-full object-cover"
                      src={
                        user.avatar
                          ? `https://messagerie-nbbh.onrender.com${user.avatar}`
                          : "/images/default-avatar.jpg"
                      }
                      alt="Profil"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/images/default-avatar.jpg";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <FiUser className="text-gray-500" size={24} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-6 flex-1 justify-center mt-8">
                  <button
                    onClick={handleShowMessages}
                    className="text-gray-500 hover:text-indigo-600 transition p-2 rounded-full hover:bg-indigo-50 relative flex items-center gap-3"
                  >
                    <FiMessageSquare size={22} />
                    <span>Messagerie</span>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={handleShowProfile}
                    className="text-indigo-600 hover:text-indigo-800 transition p-2 rounded-full hover:bg-indigo-50 flex items-center gap-3"
                  >
                    <FiSettings size={22} />
                    <span>Paramètres</span>
                  </button>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className={`mb-4 text-gray-500 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50 flex items-center gap-3 justify-center ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <FiLogOut size={22} />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar - Desktop */}
        <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center justify-between gap-5 border-r border-gray-200 bg-white z-50">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-100">
            {user ? (
              <img
                className="w-full h-full object-cover"
                src={
                  user.avatar
                    ? `https://messagerie-nbbh.onrender.com${user.avatar}`
                    : "/images/default-avatar.jpg"
                }
                alt="Profil"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/images/default-avatar.jpg";
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <FiUser className="text-gray-500" size={24} />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-8 flex-1 justify-center">
            <button
              onClick={handleShowMessages}
              className="text-gray-500 hover:text-indigo-600 transition p-2 rounded-full hover:bg-indigo-50 relative"
              title="Messagerie"
            >
              <FiMessageSquare size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={handleShowProfile}
              className="text-indigo-600 hover:text-indigo-800 transition p-2 rounded-full hover:bg-indigo-50"
              title="Paramètres"
            >
              <FiSettings size={22} />
            </button>
          </div>

          <button
            onClick={handleLogout}
            disabled={loading}
            className={`mb-4 text-gray-500 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Déconnexion"
          >
            <FiLogOut size={22} />
          </button>
        </div>

        {/* Profile Content */}
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-gray-50 py-8 px-4 sm:px-6 lg:px-8 md:ml-20 flex-1 pt-16 md:pt-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold flex items-center">
                    <FiUser className="mr-2" /> Mon Profil
                  </h1>
                  <div
                    className={`px-2 py-1 text-xs rounded-full ${
                      userDetails?.status === "En ligne"
                        ? "bg-green-500"
                        : "bg-gray-500"
                    }`}
                  >
                    {userDetails?.status || "Hors ligne"}
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}

                {!isEditing ? (
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex flex-col items-center">
                      <div className="relative group">
                        <img
                          className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
                          src={
                            userDetails?.avatar
                              ? `https://messagerie-nbbh.onrender.com${userDetails.avatar}`
                              : "/images/default-avatar.jpg"
                          }
                          alt="Photo de profil"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/default-avatar.jpg";
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                          {userDetails?.name}
                        </h2>
                        <p className="text-indigo-600 flex items-center">
                          <FiMail className="mr-2" /> {userDetails?.email}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center text-gray-600">
                          <FiPhone className="mr-2 text-indigo-500" />
                          {userDetails?.phone || "Non renseigné"}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <FiMapPin className="mr-2 text-indigo-500" />
                          {userDetails?.location || "Non renseignée"}
                        </div>
                      </div>

                      {userDetails?.bio && (
                        <div className="mt-4">
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                            Biographie
                          </h3>
                          <p className="mt-1 text-gray-700 whitespace-pre-line">
                            {userDetails.bio}
                          </p>
                        </div>
                      )}

                      <div className="pt-4">
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center shadow-md hover:shadow-lg"
                        >
                          <FiEdit className="mr-2" /> Modifier le profil
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="flex flex-col items-center">
                      <label className="cursor-pointer group">
                        <div className="relative">
                          <img
                            className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-md"
                            src={
                              avatarPreview ||
                              (userDetails?.avatar
                                ? `https://messagerie-nbbh.onrender.com${userDetails.avatar}`
                                : "/images/default-avatar.jpg")
                            }
                            alt="Aperçu"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/images/default-avatar.jpg";
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white font-medium">
                              Changer
                            </span>
                          </div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom complet
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={userDetails?.name || ""}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={userDetails?.email || ""}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={userDetails?.phone || ""}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Localisation
                        </label>
                        <input
                          type="text"
                          name="location"
                          value={userDetails?.location || ""}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Biographie
                      </label>
                      <textarea
                        name="bio"
                        rows={4}
                        value={userDetails?.bio || ""}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setAvatarFile(null);
                          setAvatarPreview("");
                        }}
                        className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center shadow-md hover:shadow-lg"
                        disabled={loading}
                      >
                        <FiX className="mr-2" /> Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center shadow-md hover:shadow-lg"
                        disabled={loading}
                      >
                        {loading ? (
                          "Enregistrement..."
                        ) : (
                          <>
                            <FiSave className="mr-2" /> Enregistrer
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showNewConversation) {
    return (
      <div className="flex w-full min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-white z-50 p-3 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="text-gray-600"
          >
            <FiMenu size={24} />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">
            Nouvelle conversation
          </h1>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>

        {/* Sidebar - Mobile */}
        {showMobileSidebar && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-4">
              <div className="flex flex-col h-full">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-100 mx-auto mt-4">
                  {user ? (
                    <img
                      className="w-full h-full object-cover"
                      src={
                        user.avatar
                          ? `https://messagerie-nbbh.onrender.com${user.avatar}`
                          : "/images/default-avatar.jpg"
                      }
                      alt="Profil"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/images/default-avatar.jpg";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <FiUser className="text-gray-500" size={24} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-6 flex-1 justify-center mt-8">
                  <button
                    onClick={handleShowMessages}
                    className="text-gray-500 hover:text-indigo-600 transition p-2 rounded-full hover:bg-indigo-50 relative flex items-center gap-3"
                  >
                    <FiMessageSquare size={22} />
                    <span>Messagerie</span>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={handleShowProfile}
                    className="text-gray-500 hover:text-indigo-600 transition p-2 rounded-full hover:bg-indigo-50 flex items-center gap-3"
                  >
                    <FiSettings size={22} />
                    <span>Paramètres</span>
                  </button>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className={`mb-4 text-gray-500 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50 flex items-center gap-3 justify-center ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <FiLogOut size={22} />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar - Desktop */}
        <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center justify-between gap-5 border-r border-gray-200 bg-white z-50">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-100">
            {user ? (
              <img
                className="w-full h-full object-cover"
                src={
                  user.avatar
                    ? `https://messagerie-nbbh.onrender.com${user.avatar}`
                    : "/images/default-avatar.jpg"
                }
                alt="Profil"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/images/default-avatar.jpg";
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <FiUser className="text-gray-500" size={24} />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-8 flex-1 justify-center">
            <button
              onClick={handleShowMessages}
              className="text-gray-500 hover:text-indigo-600 transition p-2 rounded-full hover:bg-indigo-50 relative"
              title="Messagerie"
            >
              <FiMessageSquare size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={handleShowProfile}
              className="text-gray-500 hover:text-indigo-600 transition p-2 rounded-full hover:bg-indigo-50"
              title="Paramètres"
            >
              <FiSettings size={22} />
            </button>
          </div>

          <button
            onClick={handleLogout}
            disabled={loading}
            className={`mb-4 text-gray-500 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Déconnexion"
          >
            <FiLogOut size={22} />
          </button>
        </div>

        {/* New Conversation Content */}
        <div className="flex-1 overflow-auto md:ml-20 flex items-center justify-center p-6 pt-20 md:pt-6">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Nouvelle conversation
            </h2>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher des contacts..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <FiSearch className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Contacts récents
                </h3>
                <div className="space-y-3">
                  {filteredUsers.slice(0, 5).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="relative mr-3">
                        <img
                          src={
                            user.avatar
                              ? `https://messagerie-nbbh.onrender.com${user.avatar}`
                              : "/images/default-avatar.jpg"
                          }
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/default-avatar.jpg";
                          }}
                        />
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                            user.status === "En ligne"
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                        ></div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {user.name}
                        </h4>
                        <p className="text-xs text-gray-500">{user.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white z-50 p-3 border-b border-gray-200 flex items-center justify-between">
        {selectedConversation && !showMobileConversationList ? (
          <>
            <button
              onClick={handleBackToConversations}
              className="text-gray-600"
            >
              <FiChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-semibold text-gray-800 truncate max-w-[60%]">
              {selectedConversation.name}
            </h1>
            <button
              onClick={() => setShowMobileUserDetails(true)}
              className="text-gray-600"
            >
              <BsThreeDotsVertical size={20} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="text-gray-600"
            >
              <FiMenu size={24} />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">Messages</h1>
            <button onClick={handleNewConversation} className="text-gray-600">
              <FiEdit size={20} />
            </button>
          </>
        )}
      </div>

      {/* Sidebar - Mobile */}
      {showMobileSidebar && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-4">
            <div className="flex flex-col h-full">
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-100 mx-auto mt-4">
                {user ? (
                  <img
                    className="w-full h-full object-cover"
                    src={
                      user.avatar
                        ? `https://messagerie-nbbh.onrender.com${user.avatar}`
                        : "/images/default-avatar.jpg"
                    }
                    alt="Profil"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/images/default-avatar.jpg";
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <FiUser className="text-gray-500" size={24} />
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-6 flex-1 justify-center mt-8">
                <button
                  onClick={handleShowMessages}
                  className="text-indigo-600 hover:text-indigo-800 transition p-2 rounded-full hover:bg-indigo-50 relative flex items-center gap-3"
                >
                  <FiMessageSquare size={22} />
                  <span>Messagerie</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleShowProfile}
                  className="text-gray-500 hover:text-indigo-600 transition p-2 rounded-full hover:bg-indigo-50 flex items-center gap-3"
                >
                  <FiSettings size={22} />
                  <span>Paramètres</span>
                </button>
              </div>

              <button
                onClick={handleLogout}
                disabled={loading}
                className={`mb-4 text-gray-500 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50 flex items-center gap-3 justify-center ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <FiLogOut size={22} />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center justify-between gap-5 border-r border-gray-200 bg-white z-50">
        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-100">
          {user ? (
            <img
              className="w-full h-full object-cover"
              src={
                user.avatar
                  ? `https://messagerie-nbbh.onrender.com${user.avatar}`
                  : "/images/default-avatar.jpg"
              }
              alt="Profil"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "/images/default-avatar.jpg";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <FiUser className="text-gray-500" size={24} />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-8 flex-1 justify-center">
          <button
            onClick={handleShowMessages}
            className="text-indigo-600 hover:text-indigo-800 transition p-2 rounded-full hover:bg-indigo-50 relative"
            title="Messagerie"
          >
            <FiMessageSquare size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={handleShowProfile}
            className="text-gray-500 hover:text-indigo-600 transition p-2 rounded-full hover:bg-indigo-50"
            title="Paramètres"
          >
            <FiSettings size={22} />
          </button>
        </div>

        <button
          onClick={handleLogout}
          disabled={loading}
          className={`mb-4 text-gray-500 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title="Déconnexion"
        >
          <FiLogOut size={22} />
        </button>
      </div>

      {/* Conversations List - Mobile */}
      {(showMobileConversationList || !selectedConversation) && (
        <div className="md:hidden fixed inset-0 bg-white z-40 pt-16 overflow-y-auto">
          <div className="p-4 sticky top-0 bg-white z-10 border-b border-gray-100">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition shadow-sm"
              />
              <button className="absolute right-3 top-2 text-gray-400 hover:text-indigo-600">
                <FiFilter />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  Contacts
                </h2>
                <button
                  onClick={handleNewConversation}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Voir tous
                </button>
              </div>
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {filteredUsers.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex flex-col items-center">
                    <div
                      className="relative cursor-pointer"
                      onClick={() => handleSelectUser(user)}
                    >
                      <img
                        src={
                          user.avatar
                            ? `https://messagerie-nbbh.onrender.com${user.avatar}`
                            : "/images/default-avatar.jpg"
                        }
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/images/default-avatar.jpg";
                        }}
                      />
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          user.status === "En ligne"
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      ></div>
                    </div>
                    <span className="text-xs mt-1 text-gray-600 truncate w-12 text-center">
                      {user.name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-2">
            <h2 className="px-2 text-sm font-semibold text-gray-700 mb-3">
              Messages récents
            </h2>
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {search ? "Aucun résultat trouvé" : "Aucune conversation"}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() =>
                    handleSelectUser({
                      id: conv.other_user_id,
                      name: conv.other_user_name,
                      avatar: conv.other_user_avatar,
                      status: conv.other_user_status,
                      email: conv.other_user_email, // ou "inconnu@email.com"
                    })
                  }
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition ${
                    selectedConversation?.id === conv.other_user_id
                      ? "bg-indigo-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="relative mr-3">
                    <img
                      src={
                        conv.other_user_avatar
                          ? `https://messagerie-nbbh.onrender.com${conv.other_user_avatar}`
                          : "/images/default-avatar.jpg"
                      }
                      alt={conv.other_user_name}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/images/default-avatar.jpg";
                      }}
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        conv.other_user_status === "En ligne"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    ></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conv.other_user_name}
                      </h3>
                      {conv.last_message_time && (
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {new Date(conv.last_message_time).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <p className="text-sm text-gray-500 truncate">
                        {conv.last_message || "Aucun message"}
                      </p>
                    </div>
                  </div>
                  {conv.unread_count > 0 && (
                    <div className="ml-3 flex-shrink-0 flex items-center justify-center w-5 h-5 bg-indigo-600 rounded-full text-xs text-white">
                      {conv.unread_count}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Conversations List - Desktop */}
      <div className="hidden md:flex flex-col fixed left-20 top-0 bottom-0 w-80 border-r border-gray-200 bg-white z-40 overflow-y-auto">
        <div className="p-4 sticky top-0 bg-white z-10 border-b border-gray-100">
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition shadow-sm"
            />
            <button className="absolute right-3 top-2 text-gray-400 hover:text-indigo-600">
              <FiFilter />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Contacts</h2>
              <button
                onClick={handleNewConversation}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Voir tous
              </button>
            </div>
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {filteredUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex flex-col items-center">
                  <div
                    className="relative cursor-pointer"
                    onClick={() => handleSelectUser(user)}
                  >
                    <img
                      src={
                        user.avatar
                          ? `https://messagerie-nbbh.onrender.com${user.avatar}`
                          : "/images/default-avatar.jpg"
                      }
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/images/default-avatar.jpg";
                      }}
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        user.status === "En ligne"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    ></div>
                  </div>
                  <span className="text-xs mt-1 text-gray-600 truncate w-12 text-center">
                    {user.name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-2">
          <h2 className="px-2 text-sm font-semibold text-gray-700 mb-3">
            Messages récents
          </h2>
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {search ? "Aucun résultat trouvé" : "Aucune conversation"}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() =>
                  handleSelectUser({
                    id: conv.other_user_id,
                    name: conv.other_user_name,
                    avatar: conv.other_user_avatar,
                    status: conv.other_user_status,
                    email: conv.other_user_email, // ✅ Doit exister maintenant si tu as corrigé l'interface
                  })
                }
                className={`flex items-center p-3 rounded-lg cursor-pointer transition ${
                  selectedConversation?.id === conv.other_user_id
                    ? "bg-indigo-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="relative mr-3">
                  <img
                    src={
                      conv.other_user_avatar
                        ? `https://messagerie-nbbh.onrender.com${conv.other_user_avatar}`
                        : "/images/default-avatar.jpg"
                    }
                    alt={conv.other_user_name}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/images/default-avatar.jpg";
                    }}
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      conv.other_user_status === "En ligne"
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  ></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {conv.other_user_name}
                    </h3>
                    {conv.last_message_time && (
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {new Date(conv.last_message_time).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm text-gray-500 truncate">
                      {conv.last_message || "Aucun message"}
                    </p>
                  </div>
                </div>
                {conv.unread_count > 0 && (
                  <div className="ml-3 flex-shrink-0 flex items-center justify-center w-5 h-5 bg-indigo-600 rounded-full text-xs text-white">
                    {conv.unread_count}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <>
          {/* Mobile User Details Panel */}
          {showMobileUserDetails && (
            <div className="md:hidden fixed inset-0 bg-white z-40 pt-16 overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={handleBackToChat} className="text-gray-600">
                    <FiChevronLeft size={24} />
                  </button>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Détails
                  </h2>
                  <div className="w-6"></div> {/* Spacer for alignment */}
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <img
                      src={
                        selectedConversation.avatar
                          ? `https://messagerie-nbbh.onrender.com${selectedConversation.avatar}`
                          : "/images/default-avatar.jpg"
                      }
                      alt="Profil"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/images/default-avatar.jpg";
                      }}
                    />
                    <div
                      className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white ${
                        selectedConversation.status === "En ligne"
                          ? "bg-green-500"
                          : "bg-gray-500"
                      }`}
                    ></div>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedConversation.name}
                  </h2>
                  <p className="text-sm text-gray-500 mb-1">
                    {selectedConversation.status === "En ligne"
                      ? "En ligne"
                      : "Hors ligne"}
                  </p>
                  {selectedConversation.email && (
                    <p className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                      <FiMail className="inline mr-1" />{" "}
                      {selectedConversation.email}
                    </p>
                  )}
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Informations
                  </h3>
                  <div className="space-y-3">
                    {selectedConversation.phone && (
                      <div className="flex items-center text-gray-600">
                        <FiPhone className="mr-2 text-indigo-500" />
                        <span>{selectedConversation.phone}</span>
                      </div>
                    )}
                    {selectedConversation.location && (
                      <div className="flex items-center text-gray-600">
                        <FiMapPin className="mr-2 text-indigo-500" />
                        <span>{selectedConversation.location}</span>
                      </div>
                    )}
                    {selectedConversation.bio && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-700">
                          {selectedConversation.bio}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="flex items-center text-sm font-semibold text-gray-700">
                      <FiImage className="mr-2" /> Médias partagés
                      <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {media.length}
                      </span>
                    </h3>
                    <button className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center">
                      Voir tout <FiChevronRight className="ml-1" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {media.slice(0, 6).map((img, index) => (
                      <div key={index} className="aspect-square">
                        <img
                          src={img}
                          alt={`Media ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="flex items-center text-sm font-semibold text-gray-700">
                      <FiLink className="mr-2" /> Liens partagés
                      <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {links.length}
                      </span>
                    </h3>
                    <button className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center">
                      Voir tout <FiChevronRight className="ml-1" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {links.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="flex-shrink-0 mr-3">
                          <img
                            src={link.image}
                            alt="Lien"
                            className="w-12 h-12 object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {link.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {link.url}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat Area - Mobile */}
          {!showMobileUserDetails && (
            <div className="md:hidden fixed inset-0 bg-gray-50 z-30 pt-16 flex flex-col">
              <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <div className="relative">
                    <img
                      src={
                        selectedConversation.avatar
                          ? `https://messagerie-nbbh.onrender.com${selectedConversation.avatar}`
                          : "/images/default-avatar.jpg"
                      }
                      alt="Profil"
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/images/default-avatar.jpg";
                      }}
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        selectedConversation.status === "En ligne"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />
                  </div>
                  <div className="ml-3">
                    <h2 className="font-medium text-gray-900">
                      {selectedConversation.name}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.status === "En ligne"
                        ? "En ligne"
                        : "Hors ligne"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-gray-500">
                  <button className="hover:text-indigo-600 transition">
                    <FiVideo size={20} />
                  </button>
                  <button className="hover:text-indigo-600 transition">
                    <FiPhone size={20} />
                  </button>
                  <button
                    onClick={() => setShowMobileUserDetails(true)}
                    className="hover:text-gray-700 transition"
                  >
                    <BsThreeDotsVertical size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => {
                  const showDate =
                    index === 0 ||
                    new Date(msg.created_at).toDateString() !==
                      new Date(messages[index - 1].created_at).toDateString();
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center my-6">
                          <div className="flex-1 border-t border-gray-200"></div>
                          <span className="px-3 text-xs text-gray-500">
                            {new Date(msg.created_at).toLocaleDateString(
                              "fr-FR",
                              {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                              }
                            )}
                          </span>
                          <div className="flex-1 border-t border-gray-200"></div>
                        </div>
                      )}
                      <div
                        className={`flex ${
                          msg.sender_id === selectedConversation.id
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-2xl ${
                            msg.sender_id === selectedConversation.id
                              ? "bg-white text-gray-800 rounded-bl-none shadow-sm"
                              : "bg-indigo-600 text-white rounded-br-none"
                          }`}
                        >
                          {renderMessageContent(msg)}
                          <div className="flex items-center justify-end mt-1 space-x-1 text-xs">
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {msg.sender_id !== selectedConversation.id && (
                              <BsCheckAll
                                className={`${
                                  msg.is_read
                                    ? "text-blue-300"
                                    : "text-indigo-200"
                                }`}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 bg-white border-t border-gray-200 shadow-sm">
                <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                  <button
                    onClick={handleFileSelect}
                    className="text-gray-500 hover:text-indigo-600 mr-2"
                    title="Joindre un fichier"
                  >
                    <FiPaperclip size={20} />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Écrire un message..."
                    className="flex-1 bg-transparent outline-none text-sm px-2 py-1"
                  />
                  {loading ? (
                    <div className="ml-2 p-2">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <button
                      onClick={sendMessage}
                      disabled={input.trim() === ""}
                      className={`ml-2 p-2 rounded-full transition shadow-md ${
                        input.trim() === ""
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      }`}
                    >
                      <IoMdSend size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chat Area - Desktop */}
          <div className="hidden md:flex fixed left-[400px] top-0 bottom-0 right-[25%] flex-col bg-gray-50 z-30">
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="relative">
                  <img
                    src={
                      selectedConversation.avatar
                        ? `https://messagerie-nbbh.onrender.com${selectedConversation.avatar}`
                        : "/images/default-avatar.jpg"
                    }
                    alt="Profil"
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/images/default-avatar.jpg";
                    }}
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      selectedConversation.status === "En ligne"
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  />
                </div>
                <div className="ml-3">
                  <h2 className="font-medium text-gray-900">
                    {selectedConversation.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedConversation.status === "En ligne"
                      ? "En ligne"
                      : "Hors ligne"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-gray-500">
                <button className="hover:text-indigo-600 transition">
                  <FiVideo size={20} />
                </button>
                <button className="hover:text-indigo-600 transition">
                  <FiPhone size={20} />
                </button>
                <button className="hover:text-gray-700 transition">
                  <BsThreeDotsVertical size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => {
                const showDate =
                  index === 0 ||
                  new Date(msg.created_at).toDateString() !==
                    new Date(messages[index - 1].created_at).toDateString();
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center my-6">
                        <div className="flex-1 border-t border-gray-200"></div>
                        <span className="px-3 text-xs text-gray-500">
                          {new Date(msg.created_at).toLocaleDateString(
                            "fr-FR",
                            {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            }
                          )}
                        </span>
                        <div className="flex-1 border-t border-gray-200"></div>
                      </div>
                    )}
                    <div
                      className={`flex ${
                        msg.sender_id === selectedConversation.id
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          msg.sender_id === selectedConversation.id
                            ? "bg-white text-gray-800 rounded-bl-none shadow-sm"
                            : "bg-indigo-600 text-white rounded-br-none"
                        }`}
                      >
                        {renderMessageContent(msg)}
                        <div className="flex items-center justify-end mt-1 space-x-1 text-xs">
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {msg.sender_id !== selectedConversation.id && (
                            <BsCheckAll
                              className={`${
                                msg.is_read
                                  ? "text-blue-300"
                                  : "text-indigo-200"
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-gray-200 shadow-sm">
              <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                <button
                  onClick={handleFileSelect}
                  className="text-gray-500 hover:text-indigo-600 mr-2"
                  title="Joindre un fichier"
                >
                  <FiPaperclip size={20} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Écrire un message..."
                  className="flex-1 bg-transparent outline-none text-sm px-2 py-1"
                />
                {loading ? (
                  <div className="ml-2 p-2">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <button
                    onClick={sendMessage}
                    disabled={input.trim() === ""}
                    className={`ml-2 p-2 rounded-full transition shadow-md ${
                      input.trim() === ""
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >
                    <IoMdSend size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* User Details - Desktop */}
          <div className="hidden md:flex fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 overflow-y-auto z-20">
            <div className="p-6">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <img
                    src={
                      selectedConversation.avatar
                        ? `https://messagerie-nbbh.onrender.com${selectedConversation.avatar}`
                        : "/images/default-avatar.jpg"
                    }
                    alt="Profil"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/images/default-avatar.jpg";
                    }}
                  />
                  <div
                    className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white ${
                      selectedConversation.status === "En ligne"
                        ? "bg-green-500"
                        : "bg-gray-500"
                    }`}
                  ></div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedConversation.name}
                </h2>
                <p className="text-sm text-gray-500 mb-1">
                  {selectedConversation.status === "En ligne"
                    ? "En ligne"
                    : "Hors ligne"}
                </p>
                {selectedConversation.email && (
                  <p className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                    <FiMail className="inline mr-1" />{" "}
                    {selectedConversation.email}
                  </p>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Informations
                </h3>
                <div className="space-y-3">
                  {selectedConversation.phone && (
                    <div className="flex items-center text-gray-600">
                      <FiPhone className="mr-2 text-indigo-500" />
                      <span>{selectedConversation.phone}</span>
                    </div>
                  )}
                  {selectedConversation.location && (
                    <div className="flex items-center text-gray-600">
                      <FiMapPin className="mr-2 text-indigo-500" />
                      <span>{selectedConversation.location}</span>
                    </div>
                  )}
                  {selectedConversation.bio && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">
                        {selectedConversation.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="flex items-center text-sm font-semibold text-gray-700">
                    <FiImage className="mr-2" /> Médias partagés
                    <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {media.length}
                    </span>
                  </h3>
                  <button className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center">
                    Voir tout <FiChevronRight className="ml-1" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {media.slice(0, 6).map((img, index) => (
                    <div key={index} className="aspect-square">
                      <img
                        src={img}
                        alt={`Media ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="flex items-center text-sm font-semibold text-gray-700">
                    <FiLink className="mr-2" /> Liens partagés
                    <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {links.length}
                    </span>
                  </h3>
                  <button className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center">
                    Voir tout <FiChevronRight className="ml-1" />
                  </button>
                </div>
                <div className="space-y-3">
                  {links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex-shrink-0 mr-3">
                        <img
                          src={link.image}
                          alt="Lien"
                          className="w-12 h-12 object-cover rounded"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {link.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {link.url}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="hidden md:flex flex-1 flex items-center justify-center text-gray-400 ml-[400px]">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium">
              Sélectionnez une conversation
            </h3>
            <p className="mt-1 text-sm">Ou commencez une nouvelle discussion</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
