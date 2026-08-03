"use client";

import { Toaster } from "react-hot-toast";

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        success: {
          style: { background: "#4ade80", color: "#fff" },
          iconTheme: { primary: "#fff", secondary: "#4ade80" },
        },
        error: {
          style: { background: "#f87171", color: "#fff" },
          iconTheme: { primary: "#fff", secondary: "#f87171" },
        },
      }}
      reverseOrder={false}
    />
  );
}
