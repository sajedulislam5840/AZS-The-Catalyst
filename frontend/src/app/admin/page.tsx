"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    ShieldCheck,
    Video,
    FileText,
    CheckCircle,
    Clock,
    AlertCircle,
    RefreshCw,
    LogOut,
    Loader2,
} from "lucide-react";

interface Student {
    id: number;
    full_name: string;
    email: string;
    school?: string;
    grade_class?: string;
    batch_no?: string;
    is_approved: boolean;
    subscription_end_date?: string;
    days_left: number;
}

export default function AdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"students" | "video" | "sheet">("students");
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    // New Lecture Form State
    const [lectureForm, setLectureForm] = useState({
        lecture_no: 1,
        title: "",
        topic: "",
        chapter: "",
        subject: "Physics",
        video_url: "",
    });

    // New Sheet Form State
    const [sheetForm, setSheetForm] = useState({
        title: "",
        chapter: "",
        subject: "Physics",
        file_url: "",
    });

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://edutrack-backend.onrender.com";

    const fetchStudents = async () => {
        setLoading(true);
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        try {
            const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/admin/students`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 403 || res.status === 401) {
                alert("শুধুমাত্র অ্যাডমিন/টিচার এই প্যানেলে ঢুকতে পারবে।");
                router.push("/login");
                return;
            }
            const data = await res.json();
            setStudents(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleApproveOrRenew = async (studentId: number) => {
        setActionLoadingId(studentId);
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        try {
            const res = await fetch(
                `${backendUrl.replace(/\/$/, "")}/api/v1/admin/students/${studentId}/approve-and-pay`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (res.ok) {
                await fetchStudents();
            } else {
                alert("আপডেট ব্যর্থ হয়েছে।");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleCreateLecture = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        try {
            const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/admin/lectures`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(lectureForm),
            });
            if (res.ok) {
                alert("ভিডিও লেকচার সফলভাবে আপলোড হয়েছে!");
                setLectureForm({
                    lecture_no: lectureForm.lecture_no + 1,
                    title: "",
                    topic: "",
                    chapter: "",
                    subject: "Physics",
                    video_url: "",
                });
            }
        } catch (err) {
            alert("ভিডিও যোগ করা যায়নি।");
        }
    };

    const handleCreateSheet = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        try {
            const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/admin/materials`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(sheetForm),
            });
            if (res.ok) {
                alert("লেকচার শিট সফলভাবে আপলোড হয়েছে!");
                setSheetForm({ title: "", chapter: "", subject: "Physics", file_url: "" });
            }
        } catch (err) {
            alert("শিট যোগ করা যায়নি।");
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Admin Top Header */}
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-rose-600 rounded-xl shadow-lg">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-bold text-lg text-white">EduTrack Admin</span>
                            <span className="text-xs text-rose-400 ml-2 font-mono px-2 py-0.5 bg-rose-500/10 rounded-full border border-rose-500/20">
                                Teacher Portal
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setActiveTab("students")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "students"
                                    ? "bg-slate-800 text-white font-medium"
                                    : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Students & Fees
                        </button>
                        <button
                            onClick={() => setActiveTab("video")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "video"
                                    ? "bg-slate-800 text-white font-medium"
                                    : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Upload Video
                        </button>
                        <button
                            onClick={() => setActiveTab("sheet")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "sheet"
                                    ? "bg-slate-800 text-white font-medium"
                                    : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Upload Sheet
                        </button>

                        <button
                            onClick={() => {
                                localStorage.removeItem("token");
                                router.push("/login");
                            }}
                            className="text-slate-400 hover:text-rose-400 p-2 rounded-lg ml-2"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Body */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* TAB 1: STUDENTS & FEE MANAGEMENT */}
                {activeTab === "students" && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-white">ব্যাচ শিক্ষার্থী ও ফি ব্যবস্থাপনা</h1>
                                <p className="text-slate-400 text-xs mt-1">
                                    ক্যাশ গ্রহণ করে ১-ক্লিকে ৩০ দিনের সাবস্ক্রিপশন অ্যাক্টিভ ও রিনিউ করো
                                </p>
                            </div>
                            <button
                                onClick={fetchStudents}
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-xl"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>রিফ্রেশ</span>
                            </button>
                        </div>

                        {loading ? (
                            <div className="py-20 flex justify-center text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            </div>
                        ) : (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                                            <tr>
                                                <th className="py-3.5 px-4">শিক্ষার্থী</th>
                                                <th className="py-3.5 px-4">স্কুল ও ক্লাস</th>
                                                <th className="py-3.5 px-4">ব্যাচ</th>
                                                <th className="py-3.5 px-4">স্ট্যাটাস</th>
                                                <th className="py-3.5 px-4">বাকি দিন</th>
                                                <th className="py-3.5 px-4 text-right">ফি ও অ্যাকশন</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60">
                                            {students.map((student) => (
                                                <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="py-3.5 px-4">
                                                        <div className="font-semibold text-white">{student.full_name}</div>
                                                        <div className="text-xs text-slate-400">{student.email}</div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-300">
                                                        <div>{student.school || "N/A"}</div>
                                                        <div className="text-xs text-slate-400">{student.grade_class || "-"}</div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-xs font-mono text-indigo-300">
                                                            {student.batch_no || "General"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {!student.is_approved ? (
                                                            <span className="inline-flex items-center text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                                <Clock className="w-3 h-3 mr-1" /> Pending
                                                            </span>
                                                        ) : student.days_left > 0 ? (
                                                            <span className="inline-flex items-center text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                                <CheckCircle className="w-3 h-3 mr-1" /> Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                                                <AlertCircle className="w-3 h-3 mr-1" /> Expired
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-xs">
                                                        {student.days_left > 0 ? (
                                                            <span className="text-emerald-400 font-semibold">{student.days_left} Days</span>
                                                        ) : (
                                                            <span className="text-rose-400">০ দিন (মেয়াদ শেষ)</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <button
                                                            onClick={() => handleApproveOrRenew(student.id)}
                                                            disabled={actionLoadingId === student.id}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all ${!student.is_approved
                                                                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                                                                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                                                }`}
                                                        >
                                                            {actionLoadingId === student.id ? (
                                                                <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                                            ) : !student.is_approved ? (
                                                                "Approve & Start 30D"
                                                            ) : (
                                                                "Paid: +30 Days"
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: UPLOAD VIDEO LECTURE */}
                {activeTab === "video" && (
                    <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                        <h2 className="text-lg font-bold text-white mb-4">নতুন ভিডিও ক্লাস যুক্ত করো</h2>
                        <form onSubmit={handleCreateLecture} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">লেকচার নং</label>
                                    <input
                                        type="number"
                                        required
                                        value={lectureForm.lecture_no}
                                        onChange={(e) =>
                                            setLectureForm({ ...lectureForm, lecture_no: Number(e.target.value) })
                                        }
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">বিষয়</label>
                                    <select
                                        value={lectureForm.subject}
                                        onChange={(e) =>
                                            setLectureForm({ ...lectureForm, subject: e.target.value })
                                        }
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                    >
                                        <option value="Physics">Physics</option>
                                        <option value="Chemistry">Chemistry</option>
                                        <option value="Higher Math">Higher Math</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">অধ্যায় (Chapter)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. গতিবিদ্যা (Kinematics)"
                                    value={lectureForm.chapter}
                                    onChange={(e) =>
                                        setLectureForm({ ...lectureForm, chapter: e.target.value })
                                    }
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">লেকচার শিরোনাম (Title)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. প্রাসের গতি ও প্রাস সমীকরণ"
                                    value={lectureForm.title}
                                    onChange={(e) =>
                                        setLectureForm({ ...lectureForm, title: e.target.value, topic: e.target.value })
                                    }
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">YouTube Unlisted URL</label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={lectureForm.video_url}
                                    onChange={(e) =>
                                        setLectureForm({ ...lectureForm, video_url: e.target.value })
                                    }
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg"
                            >
                                লেকচার সেভ করো
                            </button>
                        </form>
                    </div>
                )}

                {/* TAB 3: UPLOAD LECTURE SHEET */}
                {activeTab === "sheet" && (
                    <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                        <h2 className="text-lg font-bold text-white mb-4">লেকচার শিট বা PDF লিঙ্ক যুক্ত করো</h2>
                        <form onSubmit={handleCreateSheet} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">বিষয়</label>
                                <select
                                    value={sheetForm.subject}
                                    onChange={(e) =>
                                        setSheetForm({ ...sheetForm, subject: e.target.value })
                                    }
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                >
                                    <option value="Physics">Physics</option>
                                    <option value="Chemistry">Chemistry</option>
                                    <option value="Higher Math">Higher Math</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">অধ্যায় (Chapter)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. কাজ, ক্ষমতা ও শক্তি"
                                    value={sheetForm.chapter}
                                    onChange={(e) =>
                                        setSheetForm({ ...sheetForm, chapter: e.target.value })
                                    }
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">শিটের নাম (Title)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. প্র্যাকটিস প্রবলেম ও সমাধান শিট - ০১"
                                    value={sheetForm.title}
                                    onChange={(e) =>
                                        setSheetForm({ ...sheetForm, title: e.target.value })
                                    }
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Google Drive / PDF লিংক</label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://drive.google.com/file/d/..."
                                    value={sheetForm.file_url}
                                    onChange={(e) =>
                                        setSheetForm({ ...sheetForm, file_url: e.target.value })
                                    }
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg"
                            >
                                শিট সেভ করো
                            </button>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}