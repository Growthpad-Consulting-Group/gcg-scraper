"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export interface UserProfile {
  id: number;
  email: string;
  name: string;
}

const DEFAULT_NAME = "GCG BD Team";

export default function useUserProfile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const cached = localStorage.getItem("user_profile");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 3600 * 1000) {
          setUser(parsed.user);
          setLoading(false);
          return;
        }
      }

      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) throw new Error("Not authenticated");
        const { user: fetchedUser } = await res.json();
        setUser(fetchedUser);
        localStorage.setItem("user_profile", JSON.stringify({ user: fetchedUser, timestamp: Date.now() }));
      } catch {
        // leave user null; middleware already gates access to protected pages
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user_profile");
    toast.success("Logged out successfully!");
    setTimeout(() => router.push("/"), 500);
  };

  return { user, fullName: user?.name || DEFAULT_NAME, loading, handleLogout };
}
