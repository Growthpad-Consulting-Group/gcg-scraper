"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import Image from "next/image";
import toast from "react-hot-toast";
import ReCAPTCHA from "react-google-recaptcha";
import Footer from "@/shared/components/Footer";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("user_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      toast.error("Please verify the CAPTCHA.", { icon: "⚠️" });
      return;
    }

    const loadingToast = toast.loading("Please wait...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, recaptchaToken: captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid email or password.");

      if (rememberMe) {
        localStorage.setItem("user_remembered_email", email);
      } else {
        localStorage.removeItem("user_remembered_email");
      }

      toast.success("Login successful! Redirecting...", { id: loadingToast, icon: "✅" });
      router.push("/overview");
    } catch (error: any) {
      toast.error(error.message || "Invalid email or password.", { id: loadingToast, icon: "❌" });
      setCaptchaToken(null);
      recaptchaRef.current?.reset();
    }
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("Hang on tight... this might take a while");

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send magic link.");

      toast.success("Magic link sent! Check your email.", { id: loadingToast, icon: "📧" });
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send magic link. Please try again.", {
        id: loadingToast,
        icon: "❌",
      });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    if (showPasswordField) {
      handleLogin(e);
    } else {
      handleMagicLink(e);
    }
  };

  return (
    <div className="min-h-screen flex pt-14 flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-[#f05d23] bg-opacity-50">
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 transform transition-all duration-500 hover:shadow-2xl">
          <div className="mb-8 text-center">
            <Image
              src="/assets/images/logo-tagline-orange.svg"
              alt="Growthpad Consulting Group Logo"
              width={350}
              height={150}
              className="mx-auto animate-fade-in"
            />
            <p className="mt-6 text-base text-gray-600">Welcome to GCG Tender Management Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-medium text-[#231812] mb-1">E-mail:</label>
              <div className="flex items-center">
                <Icon icon="mdi:email-outline" className="absolute left-3 text-[#231812] h-5 w-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-[#f05d23] focus:border-transparent transition-all duration-200 text-[#231812] placeholder-gray-400"
                  placeholder="Enter GCG email"
                  required
                />
              </div>
            </div>

            {showPasswordField && (
              <div className="relative animate-fade-in">
                <label className="block text-sm font-medium text-[#231812] mb-1">Password</label>
                <div className="flex items-center relative">
                  <Icon icon="mdi:lock-outline" className="absolute left-3 text-[#231812] h-5 w-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-[#f05d23] focus:border-transparent transition-all duration-200 text-[#231812] placeholder-gray-400"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#231812] hover:text-[#f05d23] focus:outline-none transition-colors"
                  >
                    <Icon icon={showPassword ? "mdi:eye-off" : "mdi:eye"} className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {showPasswordField && (
              <>
                <div className="flex items-center justify-between">
                  <label className="flex items-center text-sm text-[#231812]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="mr-2 h-4 w-4 text-[#f05d23] focus:ring-[#f05d23] border-gray-300 rounded"
                    />
                    Remember me
                  </label>
                </div>

                <div className="flex justify-center">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string}
                    onChange={(token) => setCaptchaToken(token)}
                    className="transform scale-90 origin-center"
                  />
                </div>
              </>
            )}

            {showPasswordField ? (
              <div className="flex justify-between gap-4">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-[#f05d23] text-white font-semibold rounded-lg shadow-md hover:bg-[#d94f1e] hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#f05d23] focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Icon icon="mdi:login" className="h-5 w-5" />
                  Sign In
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-3 px-4 bg-[#f05d23] text-white font-semibold rounded-lg shadow-md hover:bg-[#d94f1e] hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#f05d23] focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Icon icon="mdi:email-fast" className="h-5 w-5" />
                Send me a magic link
              </button>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowPasswordField(!showPasswordField)}
                className="text-base text-[#f05d23] hover:text-[#d94f1e] transition-colors"
              >
                {showPasswordField ? "Sign in using magic link" : "Sign in using password"}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            Powered by{" "}
            <a
              href="https://growthpad.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f05d23] font-medium hover:text-[#d94f1e] transition-colors"
            >
              Growthpad Consulting Group
            </a>
          </p>
        </div>
      </div>
      <Footer mode="light" />
    </div>
  );
}
