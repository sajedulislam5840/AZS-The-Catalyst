"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
    const [currentYear, setCurrentYear] = useState(2026);

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

            let userRole = res.data.role || "STUDENT";
            let userEmail = email.trim().toLowerCase();

            localStorage.setItem("user_role", userRole);
            localStorage.setItem("user_email", userEmail);
            if (res.data.full_name) {
                localStorage.setItem("user_name", res.data.full_name);
            }
            if (res.data.batch_no) {
                localStorage.setItem("batch_no", res.data.batch_no);
            }

            if (userRole.toUpperCase() === "ADMIN" || userEmail === "rabbi@edutrack.com") {
                router.replace("/admin");
            } else {
                router.replace("/dashboard");
            }
        } catch (err: any) {
            setErrorMsg(
                err.response?.data?.detail || "Invalid email or password. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="azs-grid-bg min-h-screen text-slate-100 flex flex-col justify-between font-sans antialiased">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-[#0f172a]/95 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
                    <div className="text-center space-y-3">
                        <Link href="/" className="w-14 h-14 mx-auto rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-lg flex items-center justify-center p-1">
                            <img src="/logo.png" alt="AZS Logo" className="w-full h-full object-contain" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">AZS: The Catalyst</h1>
                            <p className="text-sm text-slate-400 mt-1">Sign in to your student portal</p>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm p-3 rounded-xl text-center font-medium" role="alert">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label htmlFor="login-email" className="text-sm font-semibold text-slate-300 block mb-1.5">Email address</label>
                            <input
                                id="login-email"
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
                            <label htmlFor="login-password" className="text-sm font-semibold text-slate-300 block mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
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

                        <button type="submit" disabled={loading} className="azs-btn-primary">
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <span>Sign in to portal</span>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-2 border-t border-slate-800/80">
                        <p className="text-sm text-slate-400">
                            Don&apos;t have an account?{" "}
                            <Link href="/register" className="text-indigo-400 font-bold hover:underline">
                                Register here
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

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0B0F19]" />}>
            <LoginContent />
        </Suspense>
    );
}
