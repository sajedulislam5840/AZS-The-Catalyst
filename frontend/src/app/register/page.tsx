"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, User, Mail, Lock, School, GraduationCap, Users, ArrowRight, Loader2, CheckCircle } from "lucide-react";

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
            const backendUrl =
                process.env.NEXT_PUBLIC_API_URL ||
                "https://edutrack-backend.onrender.com";

            const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
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
                throw new Error(data.detail || "ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਫੇਲ੍ਹ ਹੋ ਗਈ ਹੈ।");
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "ਸਰਵਰ ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।");
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
                        <h3 className="text-xl font-bold text-white">ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸਫਲ ਹੋ ਗਈ ਹੈ!</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            ਤੁਹਾਡਾ ਖਾਤਾ ਬਣ ਗਿਆ ਹੈ। ਬੈਚ ਟੀਚਰ ਵੱਲੋਂ ਫੀਸ ਦੀ ਪੁਸ਼ਟੀ ਅਤੇ <strong>Approval</strong> ਮਿਲਣ ਤੋਂ ਬਾਅਦ ਲੌਗਇਨ ਚਾਲੂ ਹੋ ਜਾਵੇਗਾ।
                        </p>
                        <div className="pt-4">
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
                            >
                                ਲੌਗਇਨ ਪੇਜ ਉੱਤੇ ਜਾਓ
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-white">ਵਿਦਿਆਰਥੀ ਖਾਤਾ ਬਣਾਓ</h2>
                            <p className="text-slate-400 text-xs mt-1">ਬੈਚ ਐਕਸੈਸ ਲਈ ਸਹੀ ਜਾਣਕਾਰੀ ਨਾਲ ਫਾਰਮ ਭਰੋ</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">ਪੂਰਾ ਨਾਮ</label>
                                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
                                    <User className="w-4 h-4 text-slate-400 mr-2" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Shukriya"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="bg-transparent border-none outline-none w-full text-slate-100 placeholder-slate-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">ਈਮੇਲ ਐਡਰੈੱਸ</label>
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
                                <label className="text-xs text-slate-400 block mb-1">ਪਾਸਵਰਡ</label>
                                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
                                    <Lock className="w-4 h-4 text-slate-400 mr-2" />
                                    <input
                                        type="password"
                                        required
                                        placeholder="ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰ"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="bg-transparent border-none outline-none w-full text-slate-100 placeholder-slate-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">ਸਕੂਲ / ਕਾਲਜ</label>
                                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
                                        <School className="w-4 h-4 text-slate-400 mr-2" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="ਸਕੂਲ ਦਾ ਨਾਮ"
                                            value={formData.school}
                                            onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                                            className="bg-transparent border-none outline-none w-full text-slate-100 placeholder-slate-500 text-xs"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">ਕਲਾਸ</label>
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
                                <label className="text-xs text-slate-400 block mb-1">ਬੈਚ</label>
                                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
                                    <Users className="w-4 h-4 text-slate-400 mr-2" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Batch 05"
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
                                        <span>ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸਬਮਿਟ ਕਰੋ</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-5 text-center text-xs text-slate-400">
                            ਪਹਿਲਾਂ ਹੀ ਖਾਤਾ ਹੈ?{" "}
                            <Link href="/login" className="text-indigo-400 hover:underline font-medium">
                                ਲੌਗਇਨ ਕਰੋ
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}