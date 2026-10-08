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
    XCircle,
    Trash2,
    Upload,
    Link as LinkIcon,
    Eye,
    EyeOff,
    ExternalLink,
} from "lucide-react";

interface Student {
    id: string;
    full_name: string;
    email: string;
    school?: string;
    grade_class?: string;
    batch_no?: string;
    is_approved: boolean;
    subscription_end_date?: string;
    days_left: number;
}

interface LectureItem {
    id: number;
    lecture_no: number;
    title: string;
    subject: string;
    chapter: string;
    video_url: string;
    is_published?: boolean;
}

interface MaterialItem {
    id: number;
    title: string;
    subject: string;
    chapter: string;
    file_url: string;
    is_published?: boolean;
}

const BACKEND_URL = "https://edutrack-backend-qjxg.onrender.com";

export default function AdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"students" | "video" | "sheet">("students");
    const [students, setStudents] = useState<Student[]>([]);
    const [lectures, setLectures] = useState<LectureItem[]>([]);
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

    // Video Form
    const [lectureForm, setLectureForm] = useState({
        lecture_no: 1,
        title: "",
        topic: "",
        chapter: "",
        subject: "Physics",
        video_url: "",
    });

    // Sheet Form (Dual Mode: Link or Local File)
    const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
    const [sheetForm, setSheetForm] = useState({
        title: "",
        chapter: "",
        subject: "Physics",
        file_url: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submittingSheet, setSubmittingSheet] = useState(false);

    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || BACKEND_URL).replace(/\/$/, "");

    // Safe Token retrieval & Auth Error handling (From Code 2)
    const getToken = () => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("token") || localStorage.getItem("access_token");
    };

    const handleAuthError = () => {
        alert("Session expired or invalid credentials. Please log in again as admin.");
        localStorage.clear();
        router.push("/login");
    };

    const fetchStudents = async () => {
        setLoading(true);
        const token = getToken();
        if (!token) return handleAuthError();

        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/students`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });

            if (res.status === 403 || res.status === 401) {
                return handleAuthError();
            }

            const data = await res.json();
            setStudents(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLectures = async () => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/lectures`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setLectures(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMaterials = async () => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/materials`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setMaterials(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchStudents();
        fetchLectures();
        fetchMaterials();
    }, []);

    // --- Student Actions ---
    const handleApproveOrRenew = async (studentId: string) => {
        setActionLoadingId(studentId);
        const token = getToken();
        if (!token) return handleAuthError();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/students/${studentId}/approve-and-pay`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) return handleAuthError();
            if (res.ok) fetchStudents();
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleRevoke = async (studentId: string) => {
        if (!confirm("Are you sure you want to revoke access and mark as unpaid?")) return;
        setActionLoadingId(studentId);
        const token = getToken();
        if (!token) return handleAuthError();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/students/${studentId}/revoke-access`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) return handleAuthError();
            if (res.ok) fetchStudents();
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDeleteStudent = async (studentId: string, email: string) => {
        if (!confirm(`Are you sure you want to permanently delete student "${email}"?`)) return;
        setActionLoadingId(studentId);
        const token = getToken();
        if (!token) return handleAuthError();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/students/${studentId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) return handleAuthError();
            if (res.ok) fetchStudents();
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    // --- Video Actions ---
    const handleCreateLecture = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = getToken();
        if (!token) return handleAuthError();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/lectures`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(lectureForm),
            });
            if (res.status === 401 || res.status === 403) return handleAuthError();
            if (res.ok) {
                alert("Video lecture published successfully!");
                setLectureForm({
                    lecture_no: lectureForm.lecture_no + 1,
                    title: "",
                    topic: "",
                    chapter: "",
                    subject: "Physics",
                    video_url: "",
                });
                fetchLectures();
            } else {
                const d = await res.json();
                alert(d.detail || "Failed to create lecture.");
            }
        } catch (err) {
            alert("Error saving lecture.");
        }
    };

    const handleToggleLecturePublish = async (id: number) => {
        const token = getToken();
        if (!token) return handleAuthError();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/lectures/${id}/toggle-publish`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) return handleAuthError();
            if (res.ok) fetchLectures();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteLecture = async (id: number) => {
        if (!confirm("Are you sure you want to permanently delete this lecture?")) return;
        setActionLoadingId(id);
        const token = getToken();
        if (!token) return handleAuthError();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/lectures/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) return handleAuthError();
            if (res.ok) fetchLectures();
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    // --- Sheet/Material Submission (Dual Mode combined with Auth Safety) ---
    const handleSubmitSheet = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = getToken();
        if (!token) return handleAuthError();

        setSubmittingSheet(true);

        try {
            if (uploadMode === "file") {
                if (!selectedFile) {
                    alert("Please select a PDF file from your computer.");
                    setSubmittingSheet(false);
                    return;
                }

                const formData = new FormData();
                formData.append("title", sheetForm.title);
                formData.append("chapter", sheetForm.chapter);
                formData.append("subject", sheetForm.subject);
                formData.append("file", selectedFile);

                const res = await fetch(`${backendUrl}/api/v1/academic/materials/upload`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });

                if (res.status === 401 || res.status === 403) {
                    handleAuthError();
                    return;
                }

                if (res.ok) {
                    alert("PDF uploaded successfully from computer!");
                    setSheetForm({ title: "", chapter: "", subject: "Physics", file_url: "" });
                    setSelectedFile(null);
                    fetchMaterials();
                } else {
                    const errData = await res.json();
                    alert(errData.detail || "Failed to upload PDF.");
                }
            } else {
                // Link Mode (Google Drive / Online URL)
                if (!sheetForm.file_url) {
                    alert("Please enter a valid document/Drive URL.");
                    setSubmittingSheet(false);
                    return;
                }

                const res = await fetch(`${backendUrl}/api/v1/admin/materials`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        title: sheetForm.title,
                        chapter: sheetForm.chapter,
                        subject: sheetForm.subject,
                        file_url: sheetForm.file_url,
                    }),
                });

                if (res.status === 401 || res.status === 403) {
                    handleAuthError();
                    return;
                }

                if (res.ok) {
                    alert("Material link saved successfully!");
                    setSheetForm({ title: "", chapter: "", subject: "Physics", file_url: "" });
                    fetchMaterials();
                } else {
                    const errData = await res.json();
                    alert(errData.detail || "Failed to save link.");
                }
            }
        } catch (err) {
            alert("Network error processing material.");
        } finally {
            setSubmittingSheet(false);
        }
    };

    const handleToggleMaterialPublish = async (id: number) => {
        const token = getToken();
        if (!token) return handleAuthError();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/materials/${id}/toggle-publish`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) return handleAuthError();
            if (res.ok) fetchMaterials();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteMaterial = async (id: number) => {
        if (!confirm("Are you sure you want to permanently delete this PDF material?")) return;
        setActionLoadingId(id);
        const token = getToken();
        if (!token) return handleAuthError();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/materials/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) return handleAuthError();
            if (res.ok) fetchMaterials();
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-bold text-lg text-white">EduTrack Admin</span>
                            <span className="text-xs text-indigo-400 ml-2 font-mono px-2 py-0.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                                Instructor Console
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setActiveTab("students")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "students" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Students & Fees
                        </button>
                        <button
                            onClick={() => setActiveTab("video")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "video" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Manage Videos
                        </button>
                        <button
                            onClick={() => setActiveTab("sheet")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "sheet" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Manage Sheets
                        </button>

                        <button
                            onClick={() => {
                                localStorage.clear();
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

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* TAB 1: STUDENTS */}
                {activeTab === "students" && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-white">Batch Students & Billing</h1>
                                <p className="text-slate-400 text-xs mt-1">Manage subscriptions, approve payments, or delete accounts</p>
                            </div>
                            <button
                                onClick={fetchStudents}
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-xl"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Refresh</span>
                            </button>
                        </div>

                        {loading ? (
                            <div className="py-20 flex justify-center text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            </div>
                        ) : students.length === 0 ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                                No students registered yet.
                            </div>
                        ) : (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                                            <tr>
                                                <th className="py-3.5 px-4">Student</th>
                                                <th className="py-3.5 px-4">Class</th>
                                                <th className="py-3.5 px-4">Batch</th>
                                                <th className="py-3.5 px-4">Status</th>
                                                <th className="py-3.5 px-4">Remaining</th>
                                                <th className="py-3.5 px-4 text-right">Actions</th>
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
                                                            <span className="inline-flex items-center text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
                                                                <Clock className="w-3 h-3 mr-1.5" /> Pending / Unpaid
                                                            </span>
                                                        ) : student.days_left > 0 ? (
                                                            <span className="inline-flex items-center text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                                                                <CheckCircle className="w-3 h-3 mr-1.5" /> Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center text-xs text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 font-medium">
                                                                <AlertCircle className="w-3 h-3 mr-1.5" /> Expired
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-xs">
                                                        {student.days_left > 0 ? (
                                                            <span className="text-emerald-400 font-semibold">{student.days_left} Days</span>
                                                        ) : (
                                                            <span className="text-rose-400 font-semibold">0 Days</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <button
                                                                onClick={() => handleApproveOrRenew(student.id)}
                                                                disabled={actionLoadingId === student.id}
                                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow transition-all ${!student.is_approved
                                                                        ? "bg-amber-600 hover:bg-amber-500 text-white"
                                                                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                                                    }`}
                                                            >
                                                                {actionLoadingId === student.id ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                                                ) : !student.is_approved ? (
                                                                    "Confirm & Grant 30D"
                                                                ) : (
                                                                    "+30 Days"
                                                                )}
                                                            </button>

                                                            {student.is_approved && (
                                                                <button
                                                                    onClick={() => handleRevoke(student.id)}
                                                                    disabled={actionLoadingId === student.id}
                                                                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-all flex items-center space-x-1"
                                                                    title="Revoke access"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5 text-amber-400" />
                                                                    <span>Revoke</span>
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => handleDeleteStudent(student.id, student.email)}
                                                                disabled={actionLoadingId === student.id}
                                                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white transition-all flex items-center space-x-1"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                <span>Delete</span>
                                                            </button>
                                                        </div>
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

                {/* TAB 2: VIDEOS */}
                {activeTab === "video" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <h2 className="text-lg font-bold text-white mb-4">Add Video Lecture</h2>
                            <form onSubmit={handleCreateLecture} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Lecture Number</label>
                                        <input
                                            type="number"
                                            required
                                            value={lectureForm.lecture_no}
                                            onChange={(e) => setLectureForm({ ...lectureForm, lecture_no: Number(e.target.value) })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Subject</label>
                                        <select
                                            value={lectureForm.subject}
                                            onChange={(e) => setLectureForm({ ...lectureForm, subject: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                        >
                                            <option value="Physics">Physics</option>
                                            <option value="Chemistry">Chemistry</option>
                                            <option value="Higher Math">Higher Math</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Chapter</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Kinematics"
                                        value={lectureForm.chapter}
                                        onChange={(e) => setLectureForm({ ...lectureForm, chapter: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Lecture Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Projectile Motion Principles"
                                        value={lectureForm.title}
                                        onChange={(e) => setLectureForm({ ...lectureForm, title: e.target.value, topic: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">YouTube URL</label>
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        value={lectureForm.video_url}
                                        onChange={(e) => setLectureForm({ ...lectureForm, video_url: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg"
                                >
                                    Save & Publish Lecture
                                </button>
                            </form>
                        </div>

                        {/* Published Videos List */}
                        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-white">Uploaded Lectures ({lectures.length})</h2>
                                <button onClick={fetchLectures} className="text-xs text-slate-400 hover:text-white flex items-center space-x-1">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Refresh</span>
                                </button>
                            </div>

                            {lectures.length === 0 ? (
                                <p className="text-xs text-slate-400 py-6 text-center">No video lectures added yet.</p>
                            ) : (
                                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                                    {lectures.map((lec) => (
                                        <div key={lec.id} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-700 text-indigo-300">
                                                        {lec.subject}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono">Lec #{lec.lecture_no}</span>
                                                    {lec.is_published === false && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                            Unpublished
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-semibold text-white">{lec.title}</h4>
                                                <p className="text-xs text-slate-400">{lec.chapter}</p>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleToggleLecturePublish(lec.id)}
                                                    className={`p-2 rounded-xl text-xs font-semibold border transition-all ${lec.is_published === false
                                                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                                                            : "bg-slate-700 border-slate-600 text-slate-300 hover:text-white"
                                                        }`}
                                                    title={lec.is_published === false ? "Publish to students" : "Unpublish (Hide)"}
                                                >
                                                    {lec.is_published === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>

                                                <a
                                                    href={lec.video_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 rounded-xl bg-slate-700 text-slate-300 hover:text-white"
                                                    title="Watch video"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>

                                                <button
                                                    onClick={() => handleDeleteLecture(lec.id)}
                                                    disabled={actionLoadingId === lec.id}
                                                    className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white transition-all"
                                                    title="Delete permanently"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: SHEETS (DUAL MODE + AUTH SECURITY) */}
                {activeTab === "sheet" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <h2 className="text-lg font-bold text-white mb-2">Upload Lecture Sheet</h2>
                            <p className="text-xs text-slate-400 mb-4">Choose whether to upload from your PC or paste a Drive link</p>

                            {/* Mode Switcher */}
                            <div className="flex bg-slate-800 p-1 rounded-xl mb-4">
                                <button
                                    type="button"
                                    onClick={() => setUploadMode("file")}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${uploadMode === "file" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Upload from PC</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadMode("link")}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${uploadMode === "link" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    <LinkIcon className="w-3.5 h-3.5" />
                                    <span>Google Drive Link</span>
                                </button>
                            </div>

                            <form onSubmit={handleSubmitSheet} className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Subject</label>
                                    <select
                                        value={sheetForm.subject}
                                        onChange={(e) => setSheetForm({ ...sheetForm, subject: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                    >
                                        <option value="Physics">Physics</option>
                                        <option value="Chemistry">Chemistry</option>
                                        <option value="Higher Math">Higher Math</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Chapter</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. আলোর প্রতিফলন"
                                        value={sheetForm.chapter}
                                        onChange={(e) => setSheetForm({ ...sheetForm, chapter: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Material Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. CQ Solution Sheet 01"
                                        value={sheetForm.title}
                                        onChange={(e) => setSheetForm({ ...sheetForm, title: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                    />
                                </div>

                                {uploadMode === "file" ? (
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Select PDF File from Computer</label>
                                        <input
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            required={uploadMode === "file"}
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setSelectedFile(e.target.files[0]);
                                                }
                                            }}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Google Drive or External PDF Link</label>
                                        <input
                                            type="url"
                                            required={uploadMode === "link"}
                                            placeholder="https://drive.google.com/file/d/..."
                                            value={sheetForm.file_url}
                                            onChange={(e) => setSheetForm({ ...sheetForm, file_url: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submittingSheet}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg flex items-center justify-center space-x-2"
                                >
                                    {submittingSheet ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Uploading/Saving...</span>
                                        </>
                                    ) : (
                                        <span>{uploadMode === "file" ? "Upload PDF to Server" : "Save Drive Link"}</span>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Previous Sheets List */}
                        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-white">Uploaded Sheets ({materials.length})</h2>
                                <button onClick={fetchMaterials} className="text-xs text-slate-400 hover:text-white flex items-center space-x-1">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Refresh</span>
                                </button>
                            </div>

                            {materials.length === 0 ? (
                                <p className="text-xs text-slate-400 py-6 text-center">No PDF sheets uploaded yet.</p>
                            ) : (
                                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                                    {materials.map((mat) => (
                                        <div key={mat.id} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-700 text-indigo-300">
                                                        {mat.subject}
                                                    </span>
                                                    {mat.is_published === false && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                            Unpublished
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-semibold text-white">{mat.title}</h4>
                                                <p className="text-xs text-slate-400">{mat.chapter}</p>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleToggleMaterialPublish(mat.id)}
                                                    className={`p-2 rounded-xl text-xs font-semibold border transition-all ${mat.is_published === false
                                                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                                                            : "bg-slate-700 border-slate-600 text-slate-300 hover:text-white"
                                                        }`}
                                                    title={mat.is_published === false ? "Publish to students" : "Unpublish (Hide)"}
                                                >
                                                    {mat.is_published === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>

                                                <a
                                                    href={mat.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 rounded-xl bg-slate-700 text-slate-300 hover:text-white"
                                                    title="Open PDF"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>

                                                <button
                                                    onClick={() => handleDeleteMaterial(mat.id)}
                                                    disabled={actionLoadingId === mat.id}
                                                    className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white transition-all"
                                                    title="Delete permanently"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}