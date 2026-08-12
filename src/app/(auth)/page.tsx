"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import Image from "next/image";
import toast from "react-hot-toast";
import ReCAPTCHA from "react-google-recaptcha";

export default function LoginPage() {
  const [email, setEmail] = useState("");
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

  const handleMagicLink = async () => {
    if (!email) {
      toast.error("Enter your email first.", { icon: "⚠️" });
      return;
    }

    const loadingToast = toast.loading("Sending magic link...");

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send magic link.");

      toast.success("Magic link sent! Check your email.", { id: loadingToast, icon: "📧" });
    } catch (error: any) {
      toast.error(error.message || "Failed to send magic link. Please try again.", {
        id: loadingToast,
        icon: "❌",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fdfaf5]">
      {/* Left panel — login form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <Image
              src="/assets/images/logo-tagline-orange.svg"
              alt="Growthpad Consulting Group Logo"
              width={300}
              height={0}
              className="animate-fade-in"
            />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#231812] mb-2">Welcome back</h1>
          <p className="text-gray-500 mb-8">Sign in to the GCG Tender Dashboard</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <label className="block text-sm font-medium text-[#231812] mb-1.5">Email Address</label>
              <div className="flex items-center">
                <Icon icon="mdi:email-outline" className="absolute left-3 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f05d23] focus:border-transparent transition-all duration-200 text-[#231812] placeholder-gray-400"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-[#231812] mb-1.5">Password</label>
              <div className="flex items-center relative">
                <Icon icon="mdi:lock-outline" className="absolute left-3 text-gray-400 h-5 w-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f05d23] focus:border-transparent transition-all duration-200 text-[#231812] placeholder-gray-400"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-400 hover:text-[#f05d23] focus:outline-none transition-colors"
                >
                  <Icon icon={showPassword ? "mdi:eye-off" : "mdi:eye"} className="h-5 w-5" />
                </button>
              </div>
            </div>

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

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#f05d23] to-[#d94f1e] text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#f05d23] focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Sign In
              <Icon icon="mdi:arrow-right" className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={handleMagicLink}
              className="w-full py-3 px-4 border border-gray-200 text-[#231812] font-medium rounded-xl hover:border-[#f05d23] hover:text-[#f05d23] transition-colors"
            >
              Send magic link instead
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don&apos;t have an account? Contact your administrator.
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
            <a href="https://growthpad.co.ke" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#f05d23] transition-colors">
              <Icon icon="mdi:chevron-left" className="h-4 w-4" />
              Back to Home
            </a>
            <span className="text-gray-300">•</span>
            <a href="mailto:support@growthpad.co.ke" className="flex items-center gap-1 hover:text-[#f05d23] transition-colors">
              <Icon icon="mdi:help-circle-outline" className="h-4 w-4" />
              Need Help?
            </a>
          </div>

          <div className="mt-6 text-center text-xs text-gray-400 space-y-1">
            <p>
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
            <p>© {new Date().getFullYear()} Growthpad Consulting Group. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Right panel — brand showcase */}
      <div className="hidden lg:flex w-1/2 bg-[#f4ede2] relative overflow-hidden items-center justify-center px-16">
        <div className="relative z-10 max-w-lg w-full">
          <div className="flex items-center gap-3 mb-6">
            <Image
              src="/assets/images/logo.svg"
              alt="GCG"
              width={200}
              height={0}
            />
          </div>

          <span className="inline-block mb-8 px-4 py-1.5 rounded-full bg-white/70 text-sm text-[#231812] border border-[#231812]/10">
            ● Tender Intelligence Platform
          </span>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white/60 rounded-2xl p-6 border border-white/50">
              <div className="h-10 w-10 rounded-xl bg-[#fdf1e7] flex items-center justify-center mb-4">
                <Icon icon="mdi:lightning-bolt" className="h-5 w-5 text-[#f05d23]" />
              </div>
              <h3 className="font-bold text-[#231812] mb-1">Real-Time Alerts</h3>
              <p className="text-sm text-gray-500">Never miss a new tender opportunity</p>
            </div>
            <div className="bg-white/60 rounded-2xl p-6 border border-white/50">
              <div className="h-10 w-10 rounded-xl bg-[#e9f7ee] flex items-center justify-center mb-4">
                <Icon icon="mdi:chart-line" className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-bold text-[#231812] mb-1">Live Analytics</h3>
              <p className="text-sm text-gray-500">Track tenders and lead performance</p>
            </div>
            <div className="bg-white/60 rounded-2xl p-6 border border-white/50">
              <div className="h-10 w-10 rounded-xl bg-[#e9f0fb] flex items-center justify-center mb-4">
                <Icon icon="mdi:shield-check" className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-[#231812] mb-1">Secure</h3>
              <p className="text-sm text-gray-500">Bank-level data protection</p>
            </div>
            <div className="bg-white/60 rounded-2xl p-6 border border-white/50">
              <div className="h-10 w-10 rounded-xl bg-[#fdeaea] flex items-center justify-center mb-4">
                <Icon icon="mdi:layers" className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="font-bold text-[#231812] mb-1">Multi-Source</h3>
              <p className="text-sm text-gray-500">Unified scraping across sources</p>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #f05d23 0, transparent 40%), radial-gradient(circle at 80% 70%, #231812 0, transparent 40%)" }} />
      </div>
    </div>
  );
}
