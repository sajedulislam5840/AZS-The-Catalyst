"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  User,
  Mail,
  Lock,
  GraduationCap,
  Users,
  Building2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://edutrack-backend-qjxg.onrender.com"
).replace(/\/$/, "");

const api = axios.create({
  baseURL: BACKEND_URL,
});

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [school, setSchool] = useState("");
  const [gradeClass, setGradeClass] = useState("Class 10");
  const [batchNo, setBatchNo] = useState("Batch 01");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentYear, setCurrentYear] = useState(2025);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      await api.post("/api/v1/auth/register", {
        full_name: fullName.trim(),
        email: email.trim(),
        password: password,
        school: school.trim(),
        grade_class: gradeClass,
        batch_no: batchNo,
      });

      router.push(`/login?email=${encodeURIComponent(email.trim())}`);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail ||
          "Registration failed. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="azs-grid-bg relative min-h-screen text-slate-100 flex flex-col justify-between font-sans antialiased overflow-hidden selection:bg-indigo-500/30">
      {/* Ambient background glow orbs */}
      <div className="azs-orb azs-orb-indigo top-[-100px] left-1/2 -translate-x-1/2 h-[450px] w-[550px] opacity-35" />
      <div className="azs-orb azs-orb-cyan bottom-[-80px] left-[-50px] h-[380px] w-[380px] opacity-25" />
      <div className="azs-orb azs-orb-violet top-[200px] right-[-100px] h-[350px] w-[350px] opacity-20" />

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
          <span className="azs-badge azs-badge-cyan text-[10px]">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            New Batch Registration
          </span>
        </div>
      </header>

      {/* Main Registration Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="azs-card-glow max-w-lg w-full p-6 sm:p-8 bg-[#0a0f1d]/90 backdrop-blur-2xl shadow-2xl shadow-black/80 space-y-6"
        >
          {/* Logo & Header Title */}
          <div className="text-center space-y-3">
            <Link href="/" className="inline-flex relative group">
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
              <h1 className="text-2xl font-black text-white tracking-tight">
                Create Student Account
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your batch &amp; academic details to access lectures and AI tutoring.
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

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="reg-name"
                className="text-xs font-bold text-slate-300 block mb-1.5 tracking-wide"
              >
                Full Name
              </label>
              <div className="relative">
                <input
                  id="reg-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Razon Islam"
                  className="azs-input pl-10 text-sm"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="reg-email"
                className="text-xs font-bold text-slate-300 block mb-1.5 tracking-wide"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="reg-email"
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

            {/* Password */}
            <div>
              <label
                htmlFor="reg-password"
                className="text-xs font-bold text-slate-300 block mb-1.5 tracking-wide"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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

            {/* Grid 2 Columns: School + Class */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Institution */}
              <div>
                <label
                  htmlFor="reg-school"
                  className="text-xs font-bold text-slate-300 block mb-1.5 tracking-wide"
                >
                  School / College
                </label>
                <div className="relative">
                  <input
                    id="reg-school"
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Institution name"
                    className="azs-input pl-10 text-xs"
                  />
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Class / Grade Select */}
              <div>
                <label
                  htmlFor="reg-class"
                  className="text-xs font-bold text-slate-300 block mb-1.5 tracking-wide"
                >
                  Class / Level
                </label>
                <div className="relative">
                  <select
                    id="reg-class"
                    value={gradeClass}
                    onChange={(e) => setGradeClass(e.target.value)}
                    className="azs-input pl-10 text-xs appearance-none cursor-pointer"
                  >
                    <option value="Class 9" className="bg-slate-900 text-white">Class 9</option>
                    <option value="Class 10" className="bg-slate-900 text-white">Class 10</option>
                    <option value="HSC 1st Year" className="bg-slate-900 text-white">HSC 1st Year</option>
                    <option value="HSC 2nd Year" className="bg-slate-900 text-white">HSC 2nd Year</option>
                  </select>
                  <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Batch Assignment */}
            <div>
              <label
                htmlFor="reg-batch"
                className="text-xs font-bold text-slate-300 block mb-1.5 tracking-wide"
              >
                Batch Designation
              </label>
              <div className="relative">
                <input
                  id="reg-batch"
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="e.g. Batch 01"
                  className="azs-input pl-10 text-sm"
                />
                <Users className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="azs-btn-cyan mt-2 w-full py-3.5 text-sm font-extrabold group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-900" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Student Registration</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Sign In Redirect Link */}
          <div className="text-center pt-4 border-t border-slate-800/80">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-indigo-400 font-bold hover:text-indigo-300 hover:underline transition-colors"
              >
                Sign in to portal ↗
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
