"use client";

import React, { useState } from "react";
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
  ChevronLeft,
  ArrowRight,
  AlertCircle,
  Sparkles,
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

      // Redirect to login with pre-filled email
      router.push(`/login?email=${encodeURIComponent(email.trim())}`);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail ||
          "Registration failed. Please check your connectivity and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans selection:bg-blue-100">
      {/* Header / Navigation */}
      <header className="w-full max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-slate-500 hover:text-[#1E3A8A] transition-colors font-medium text-sm"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-[#E6E1D8] flex items-center justify-center group-hover:border-[#1E3A8A] transition-all">
            <ChevronLeft className="w-4 h-4" />
          </div>
          <span>Back to Home</span>
        </Link>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3 h-3" />
          Academic Enrollment Open
        </div>
      </header>

      {/* Registration Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl bg-white border border-[#E6E1D8] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
        >
          {/* Top Branding Strip */}
          <div className="bg-[#1E3A8A] h-2 w-full" />

          <div className="p-8 sm:p-10">
            {/* Logo & Intro */}
            <div className="text-center mb-8">
              <div className="inline-block w-16 h-16 rounded-2xl bg-[#FAF8F5] border border-[#E6E1D8] p-2 mb-4">
                <img
                  src="/logo.png"
                  alt="AZS Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold text-[#1E3A8A] tracking-tight">
                Create Student Account
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Join the catalyst for your academic excellence.
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleRegister} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 ml-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full h-12 pl-12 pr-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl focus:ring-2 focus:ring-[#0369A1]/20 focus:border-[#0369A1] outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-12 pl-12 pr-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl focus:ring-2 focus:ring-[#0369A1]/20 focus:border-[#0369A1] outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 ml-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full h-12 pl-12 pr-12 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl focus:ring-2 focus:ring-[#0369A1]/20 focus:border-[#0369A1] outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Academic Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 ml-1">
                    Institution
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="School/College"
                      className="w-full h-12 pl-12 pr-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl focus:ring-2 focus:ring-[#0369A1]/20 focus:border-[#0369A1] outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 ml-1">
                    Class / Grade
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <select
                      value={gradeClass}
                      onChange={(e) => setGradeClass(e.target.value)}
                      className="w-full h-12 pl-12 pr-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl focus:ring-2 focus:ring-[#0369A1]/20 focus:border-[#0369A1] outline-none appearance-none cursor-pointer text-slate-900"
                    >
                      <option value="Class 9">Class 9</option>
                      <option value="Class 10">Class 10</option>
                      <option value="HSC 1st Year">HSC 1st Year</option>
                      <option value="HSC 2nd Year">HSC 2nd Year</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Batch Assignment */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 ml-1">
                  Batch Designation
                </label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    placeholder="e.g. Batch 01"
                    className="w-full h-12 pl-12 pr-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl focus:ring-2 focus:ring-[#0369A1]/20 focus:border-[#0369A1] outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white font-bold rounded-xl shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 transition-all disabled:opacity-70 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[#E6E1D8] text-center">
              <p className="text-sm text-slate-500">
                Already registered?{" "}
                <Link
                  href="/login"
                  className="text-[#0369A1] font-bold hover:underline underline-offset-4 transition-all"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
