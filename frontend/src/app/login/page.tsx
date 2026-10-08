"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { LogIn, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";

const BACKEND_URL = (
    process.env.NEXT_PUBLIC_API_URL || "https://edutrack-backend-qjxg.onrender.com"
).replace(/\/$/, "");

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password;

        try {
            let res;
            // Resilient Dual-Route dispatch
            try {
                res = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
                    email: cleanEmail,
                    password: cleanPassword,
                });
            } catch (err: any) {
                if (err.response?.status === 404) {
                    res = await axios.post(`${BACKEND_URL}/api/v1/login`, {
                        email: cleanEmail,
                        password: cleanPassword,
                    });
                } else {
                    throw err;
                }
            }

            const data = res.data;
            const token = data.access_token || data.token;

            if (!token) {
                throw new Error("No authentication token received.");
            }

            localStorage.setItem("token", token);
            localStorage.setItem("access_token", token);

            let user = data;
            try {
                let meRes;
                try {
                    meRes = await axios.get(`${BACKEND_URL}/api/v1/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                } catch {
                    meRes = await axios.get(`${BACKEND_URL}/api/v1/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                }
                if (meRes?.data) {
                    user = meRes.data;
                }
            } catch {
                // Fallback to initial token response
            }

            const userRole = (user.role || data.role || "").toUpperCase();
            const userEmail = (user.email || cleanEmail).toLowerCase();

            localStorage.setItem("user_role", userRole);
            localStorage.setItem("user_email", userEmail);
            localStorage.setItem("user_name", user.full_name || "User");
            if (user.batch_no) localStorage.setItem("batch_no", user.batch_no);

            const isAdmin =
                Boolean(user.is_admin) ||
                userRole === "ADMIN" ||
                userEmail === "rabbi@edutrack.com";

            if (isAdmin) {
                window.location.href = "/admin";
            } else {
                window.location.href = "/dashboard";
            }
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            setError(
                typeof detail === "string"
                    ? detail
                    : "Login failed. Please verify email and password."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-xl border border-slate-200/80 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md shadow-indigo-600/30">
                        E
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        Sign In to EduTrack
                    </h2>
                    <p className="text-xs text-slate-400">
                        Access your academic suite or instructor console
                    </p>
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Email Address</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                                type="email"
                                required
                                placeholder="rabbi@edutrack.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#F4F6FA] border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Password</label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#F4F6FA] border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <span>Authenticating...</span>
                        ) : (
                            <>
                                <span>Continue</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                        Need an account?{" "}
                        <Link
                            href="/register"
                            className="text-indigo-600 font-bold hover:underline"
                        >
                            Sign Up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}