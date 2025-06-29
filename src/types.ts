export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  status: "En ligne" | "Hors ligne";
  bio?: string;
  phone?: string;
  location?: string;
  lastSeen?: string;
  lastMessage?: string;
}

export interface Message {
  id: number;
  content: string;
  sender_id: number;
  receiver_id: number;
  created_at: string;
  read: boolean;
  sender_name?: string;
  sender_avatar?: string;
  receiver_name?: string;
  receiver_avatar?: string;
}