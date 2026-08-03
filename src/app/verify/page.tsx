"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Footer from "@/shared/ui/Footer";
import { Icon } from "@iconify/react";
import Image from "next/image";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedVerification = useRef(false);

  useEffect(() => {
    const token = searchParams?.get("token");
    const email = searchParams?.get("email");

    if (token && email && !isProcessing && !error && !hasAttemptedVerification.current) {
      hasAttemptedVerification.current = true;
      setIsProcessing(true);

      const verifyMagicLink = async () => {
        try {
          const res = await fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, email }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Invalid or expired token");

          toast.success("Login successful! Redirecting...", { icon: "✅" });
          router.push("/overview");
        } catch (err: any) {
          if (err.message?.includes("invalid") || err.message?.includes("expired")) {
            toast.error("The magic link is invalid or has expired. Please request a new one.", {
              icon: "❌",
              duration: 6000,
            });
            setError("The magic link is invalid or has expired.");
          } else {
            toast.error("Failed to verify the magic link. Please try again.", {
              icon: "❌",
              duration: 6000,
            });
            setError("Failed to verify the magic link.");
          }
        } finally {
          setIsProcessing(false);
        }
      };

      verifyMagicLink();
    }
  }, [searchParams, router, isProcessing, error]);

  const handleRetry = () => router.push("/");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-[#f05d23] bg-opacity-50">
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full text-center">
          <Image
            src="/assets/images/logo-tagline-orange.svg"
            alt="Growthpad Consulting Group Logo"
            width={350}
            height={150}
            className="mx-auto animate-fade-in"
          />
          {error ? (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Verification Failed</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={handleRetry}
                className="bg-[#f05d23] text-white px-6 py-2 rounded-md hover:bg-[#d94f1e] transition-colors"
              >
                Request a New Link
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Verifying Magic Link</h2>
              <p className="text-gray-600 mb-6">Please wait while we verify your login...</p>
              <div className="flex justify-center">
                <Icon icon="eos-icons:loading" className="h-8 w-8 text-[#f05d23] animate-spin" />
              </div>
            </>
          )}
        </div>
      </div>
      <Footer mode="light" />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  );
}
