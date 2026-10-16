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
  Sparkles,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";

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
  const [currentYear, setCurrentYear] = useState(2025);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
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
    <div className="azs-grid-bg relative min-h-screen text-slate-100 flex flex-col justify-between font-sans antialiased overflow-hidden selection:bg-indigo-500/30">
      {/* Ambient background glow orbs */}
      <div className="azs-orb azs-orb-indigo top-[-100px] left-1/2 -translate-x-1/2 h-[400px] w-[500px] opacity-35" />
      <div className="azs-orb azs-orb-cyan bottom-[-50px] right-[-50px] h-[350px] w-[350px] opacity-25" />

      {/* Top Floating Navigation */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-xs font-semibold text-slate-300 backdrop-blur-md transition-all hover:border-slate-700 hover:bg-slate-900 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 text-cyan-400" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="azs-badge azs-badge-indigo text-[10px]">
            <ShieldCheck className="h-3 w-3 text-cyan-400" />
            Secure Portal
          </span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="azs-card-glow max-w-md w-full p-6 sm:p-8 bg-[#0a0f1d]/90 backdrop-blur-2xl shadow-2xl shadow-black/80 space-y-6"
        >
          {/* Logo & Header Title */}
          <div className="text-center space-y-3">
            <Link
              href="/"
              className="inline-flex relative group"
            >
              <div className="w-16 h-14 mx-auto rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-xl flex items-center justify-center p-1.5 transition-transform group-hover:scale-105">
                <img
                  src="/logo.png"
                  alt="AZS Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </Link>

            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                Sign In to Portal
              </h1>
              <p className="text-xs text-slate-400 mt-1">
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
                className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3.5 rounded-xl flex items-start gap-2.5 shadow-lg shadow-rose-950/20"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                className="text-xs font-bold text-slate-300 block mb-1.5 tracking-wide"
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
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="text-xs font-bold text-slate-300 block tracking-wide"
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
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
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
              className="azs-btn-primary mt-2 py-3.5 text-sm font-extrabold group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Registration Redirect Banner */}
          <div className="text-center pt-4 border-t border-slate-800/80">
            <p className="text-xs text-slate-400">
              Don&apos;t have a batch account yet?{" "}
              <Link
                href="/register"
                className="text-cyan-400 font-bold hover:text-cyan-300 hover:underline transition-colors"
              >
                Register as a student ↗
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 px-6 text-center border-t border-slate-800/80 bg-[#040810]/80 backdrop-blur-md">
        <p className="text-xs text-slate-400">
          © {currentYear} AZS: The Catalyst · Developed with ❤️ by{" "}
          <a
            href="https://www.linkedin.com/in/sajedul-islam-data/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Mir Mohammad Sajedul Islam
          </a>
        </p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060a12]" />}>
      <LoginContent />
    </Suspense>
  );
}
