"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function useUserProfile() {
  const [fullName, setFullName] = useState("GCG BD Team");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const cached = localStorage.getItem("user_profile");
      if (cached) {
        const { name, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 3600 * 1000) {
          setFullName(name);
          setLoading(false);
          return;
        }
      }

      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) throw new Error("Not authenticated");
        const { user } = await res.json();
        const name = user.name || "GCG BD Team";
        setFullName(name);
        localStorage.setItem("user_profile", JSON.stringify({ name, timestamp: Date.now() }));
      } catch {
        // leave default name; middleware already gates access to protected pages
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

  return { fullName, loading, setFullName, handleLogout };
}
