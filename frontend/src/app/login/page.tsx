"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import SiteFooter from "@/components/SiteFooter";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://edutrack-backend-qjxg.onrender.com"
).replace(/\/$/, "");

const api = axios.create({
  baseURL: BACKEND_URL,
});

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const prefilledEmail = searchParams.get("email");
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await api.post("/api/v1/auth/login", {
        email: email.trim(),
        password: password,
      });

      const token = res.data.access_token || res.data.token;
      if (!token) {
        throw new Error("Authentication token not received.");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("access_token", token);

      const userRole = res.data.role || "STUDENT";
      const userEmail = email.trim().toLowerCase();

      localStorage.setItem("user_role", userRole);
      localStorage.setItem("user_email", userEmail);
      if (res.data.full_name) {
        localStorage.setItem("user_name", res.data.full_name);
      }
      if (res.data.batch_no) {
        localStorage.setItem("batch_no", res.data.batch_no);
      }

      if (
        userRole.toUpperCase() === "ADMIN" ||
        userEmail === "rabbi@edutrack.com"
      ) {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail ||
          "Invalid email or password. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="azs-grid-bg relative min-h-screen text-[#1E293B] flex flex-col justify-between font-sans antialiased overflow-x-hidden">
      {/* Top Floating Navigation */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-[#E6E1D8] bg-white px-3.5 py-2 text-xs font-bold text-[#1E293B] shadow-sm transition-all hover:bg-[#FAF8F5] active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 text-[#0369A1]" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="azs-badge azs-badge-indigo text-[10px]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#1E3A8A]" />
            Secure Portal
          </span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="azs-card max-w-md w-full p-6 sm:p-8 bg-white border border-[#E6E1D8] shadow-[0_8px_30px_-8px_rgba(30,41,59,0.08)] space-y-6"
        >
          {/* Logo & Header Title */}
          <div className="text-center space-y-3">
            <Link href="/" className="inline-flex relative group">
              <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden bg-[#FAF8F5] border border-[#E6E1D8] shadow-sm flex items-center justify-center p-2 transition-transform group-hover:scale-105">
                <img
                  src="/logo.png"
                  alt="AZS Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </Link>

            <div>
              <h1 className="text-2xl font-black text-[#1E3A8A] tracking-tight">
                Sign In to Portal
              </h1>
              <p className="text-xs text-[#64748B] mt-1">
                Enter your student or instructor credentials to access classes.
              </p>
            </div>
          </div>

          {/* Error Message Alert */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5 shadow-sm"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                className="text-xs font-extrabold text-[#1E293B] block mb-1.5 tracking-wide"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="azs-input pl-10 text-sm"
                />
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="text-xs font-extrabold text-[#1E293B] block tracking-wide"
                >
                  Password
                </label>
              </div>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="azs-input pl-10 pr-11 text-sm"
                />
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E293B] transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="azs-btn-primary min-h-[48px] mt-2 text-sm font-extrabold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Redirect Banner */}
          <div className="text-center pt-4 border-t border-[#E6E1D8]">
            <p className="text-xs text-[#64748B]">
              Don&apos;t have a batch account yet?{" "}
              <Link
                href="/register"
                className="text-[#0369A1] font-bold hover:underline transition-colors"
              >
                Register as a student ↗
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Shared Unified Footer */}
      <SiteFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F5]" />}>
      <LoginContent />
    </Suspense>
  );
}
