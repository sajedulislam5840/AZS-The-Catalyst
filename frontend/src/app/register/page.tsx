"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
  const [currentYear, setCurrentYear] = useState(2026);

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
        err.response?.data?.detail || "Registration failed. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="azs-grid-bg min-h-screen text-slate-100 flex flex-col justify-between font-sans antialiased py-6">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-[#0f172a]/95 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <Link href="/" className="w-14 h-14 mx-auto rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-lg flex items-center justify-center p-1">
              <img src="/logo.png" alt="AZS Logo" className="w-full h-full object-contain" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Create student account</h1>
              <p className="text-sm text-slate-400 mt-1">Add your batch details to join the portal</p>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm p-3 rounded-xl text-center font-medium" role="alert">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="text-sm font-semibold text-slate-300 block mb-1.5">Full name</label>
              <input
                id="reg-name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Razon"
                className="azs-input"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="text-sm font-semibold text-slate-300 block mb-1.5">Email address</label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="azs-input"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="text-sm font-semibold text-slate-300 block mb-1.5">Password</label>
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
                  className="azs-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-school" className="text-sm font-semibold text-slate-300 block mb-1.5">School / college</label>
                <input
                  id="reg-school"
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Institution name"
                  className="azs-input"
                />
              </div>
              <div>
                <label htmlFor="reg-class" className="text-sm font-semibold text-slate-300 block mb-1.5">Class / grade</label>
                <select
                  id="reg-class"
                  value={gradeClass}
                  onChange={(e) => setGradeClass(e.target.value)}
                  className="azs-input"
                >
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="HSC 1st Year">HSC 1st Year</option>
                  <option value="HSC 2nd Year">HSC 2nd Year</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="reg-batch" className="text-sm font-semibold text-slate-300 block mb-1.5">Batch assignment</label>
              <input
                id="reg-batch"
                type="text"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="Batch 01"
                className="azs-input"
              />
            </div>

            <button type="submit" disabled={loading} className="azs-btn-primary">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit registration</span>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800/80">
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <footer className="w-full py-4 px-6 text-center border-t border-slate-800/80 bg-[#0c1227]/90 backdrop-blur-sm">
        <p className="text-xs text-slate-400 font-medium">
          © {currentYear} AZS: The Catalyst · Developed with ❤️ by{" "}
          <a
            href="https://www.linkedin.com/in/sajedul-islam-data/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition"
          >
            Mir Mohammad Sajedul Islam
          </a>
        </p>
      </footer>
    </div>
  );
}
