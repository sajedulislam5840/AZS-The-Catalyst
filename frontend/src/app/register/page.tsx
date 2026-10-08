"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    BookOpen,
    User,
    Mail,
    Lock,
    School,
    GraduationCap,
    Users,
    ArrowRight,
    Loader2,
    CheckCircle,
} from "lucide-react";

const BACKEND_URL = "https://edutrack-backend-qjxg.onrender.com";

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        school: "",
        gradeClass: "Class 10",
        batchNo: "Batch 01",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const targetBase = (
                process.env.NEXT_PUBLIC_API_URL || BACKEND_URL
            ).replace(/\/$/, "");

            const res = await fetch(`${targetBase}/api/v1/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    full_name: formData.fullName,
                    email: formData.email,
                    password: formData.password,
                    school: formData.school,
                    grade_class: formData.gradeClass,
                    batch_no: formData.batchNo,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Registration failed. Please try again.");
            }

            setSuccess(true);
        } catch (err: any) {
            if (err.message === "Failed to fetch") {
                setError(
                    "Unable to connect to the backend server. Please verify your connection or retry in a few moments."
                );
            } else {
                setError(err.message || "An unexpected error occurred.");
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

                {success ? (
                    <div className="text-center py-6 space-y-4">
                        <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto" />
                        <h3 className="text-xl font-bold text-white">Registration Submitted!</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Your account has been created successfully. Access will be unlocked once your batch instructor confirms your payment and grants approval.
                        </p>
                        <div className="pt-4">
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
                            >
                                Go to Sign In
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-white">Create Student Account</h2>
                            <p className="text-slate-400 text-xs mt-1">Provide your academic batch details to get started</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs text-center leading-relaxed">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Full Name</label>
                                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
                                    <User className="w-4 h-4 text-slate-400 mr-2" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Razon"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="bg-transparent border-none outline-none w-full text-slate-100 placeholder-slate-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Email Address</label>
                                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
                                    <Mail className="w-4 h-4 text-slate-400 mr-2" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="student@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                                        placeholder="At least 6 characters"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="bg-transparent border-none outline-none w-full text-slate-100 placeholder-slate-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">School / College</label>
                                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
                                        <School className="w-4 h-4 text-slate-400 mr-2" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="School name"
                                            value={formData.school}
                                            onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                                            className="bg-transparent border-none outline-none w-full text-slate-100 placeholder-slate-500 text-xs"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Class / Grade</label>
                                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
                                        <GraduationCap className="w-4 h-4 text-slate-400 mr-2" />
                                        <select
                                            value={formData.gradeClass}
                                            onChange={(e) => setFormData({ ...formData, gradeClass: e.target.value })}
                                            className="bg-transparent border-none outline-none w-full text-slate-100 text-xs"
                                        >
                                            <option value="Class 9" className="bg-slate-900">Class 9</option>
                                            <option value="Class 10" className="bg-slate-900">Class 10</option>
                                            <option value="SSC Candidate" className="bg-slate-900">SSC Candidate</option>
                                            <option value="HSC 1st Year" className="bg-slate-900">HSC 1st Year</option>
                                            <option value="HSC 2nd Year" className="bg-slate-900">HSC 2nd Year</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Batch Assignment</label>
                                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
                                    <Users className="w-4 h-4 text-slate-400 mr-2" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Batch 01"
                                        value={formData.batchNo}
                                        onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                                        className="bg-transparent border-none outline-none w-full text-slate-100 placeholder-slate-500 text-xs"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <span>Submit Registration</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-5 text-center text-xs text-slate-400">
                            Already have an account?{" "}
                            <Link href="/login" className="text-indigo-400 hover:underline font-medium">
                                Sign In
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}