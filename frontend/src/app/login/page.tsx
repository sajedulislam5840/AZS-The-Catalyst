"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const rawUrl =
                process.env.NEXT_PUBLIC_API_URL || "https://edutrack-backend.onrender.com";
            const backendUrl = rawUrl.replace(/\/$/, "");

            const res = await fetch(`${backendUrl}/api/v1/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password: password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Invalid email or password.");
            }

            // Check approval for students
            if (!data.is_admin && !data.is_approved) {
                throw new Error(
                    "Your account has not been approved yet. Please contact your batch teacher to activate access."
                );
            }

            // Save auth storage
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("is_admin", String(data.is_admin));
            localStorage.setItem("user_name", data.full_name || "");

            if (data.is_admin) {
                router.push("/admin");
            } else {
                router.push("/dashboard");
            }
        } catch (err: any) {
            if (err.message === "Failed to fetch") {
                setError(
                    "Unable to connect to the backend server. The backend instance may be waking up from cold sleep. Please wait 15 seconds and try again."
                );
            } else {
                setError(err.message || "An unexpected error occurred during sign in.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center space-x-3 mb-6 justify-center">
                    <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg">
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        EduTrack
                    </span>
                </div>

                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white">Sign In</h2>
                    <p className="text-slate-400 text-xs mt-1">Access your registered academic batches</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs text-center leading-relaxed">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Email Address</label>
                        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
                            <Mail className="w-4 h-4 text-slate-400 mr-2" />
                            <input
                                type="email"
                                required
                                placeholder="name@edutrack.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-slate-100 placeholder-slate-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Password</label>
                        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
                            <Lock className="w-4 h-4 text-slate-400 mr-2" />
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-slate-100 placeholder-slate-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-400">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-indigo-400 hover:underline font-medium">
                        Register here
                    </Link>
                </div>
            </div>
        </div>
    );
}