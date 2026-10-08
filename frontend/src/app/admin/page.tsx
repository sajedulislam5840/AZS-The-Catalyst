"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    ShieldCheck,
    RefreshCw,
    LogOut,
    Loader2,
    Trash2,
    Upload,
    Link as LinkIcon,
    Eye,
    EyeOff,
    ExternalLink,
    Users,
    Layers,
    CheckCircle2,
    XCircle,
    Search,
    Edit2,
    X,
    BookOpen,
    ArrowUp,
    ArrowDown,
    ListOrdered,
    Sparkles,
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
    id: string;
    lecture_no: number;
    title: string;
    subject: string;
    chapter: string;
    video_url: string;
    is_published?: boolean;
}

interface MaterialItem {
    id: string;
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
    const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
    const [searchStudentQuery, setSearchStudentQuery] = useState("");
    const [students, setStudents] = useState<Student[]>([]);
    const [lectures, setLectures] = useState<LectureItem[]>([]);
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

    // Video Filtering & Ordering State
    const [filterVideoSubject, setFilterVideoSubject] = useState<string>("ALL");
    const [filterVideoChapter, setFilterVideoChapter] = useState<string>("ALL");
    const [reordering, setReordering] = useState(false);

    // Forms
    const [lectureForm, setLectureForm] = useState({
        lecture_no: 1,
        title: "",
        topic: "",
        chapter: "",
        subject: "Physics",
        video_url: "",
    });

    const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
    const [sheetForm, setSheetForm] = useState({
        title: "",
        chapter: "",
        subject: "Physics",
        file_url: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submittingSheet, setSubmittingSheet] = useState(false);

    // Edit Modals
    const [editingLecture, setEditingLecture] = useState<LectureItem | null>(null);
    const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);

    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || BACKEND_URL).replace(/\/$/, "");

    const getToken = () => {
        if (typeof window === "undefined") return "";
        return localStorage.getItem("token") || localStorage.getItem("access_token") || "";
    };

    const fetchStudents = async () => {
        setLoading(true);
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/students`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setStudents(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLectures = async () => {
        const token = getToken();
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

    const batchList = useMemo(() => {
        const set = new Set<string>();
        students.forEach((s) => {
            if (s.batch_no && s.batch_no.trim()) {
                set.add(s.batch_no.trim());
            } else {
                set.add("General");
            }
        });
        return Array.from(set).sort();
    }, [students]);

    // Distinct Chapters for Sequence Manager
    const uniqueChapters = useMemo(() => {
        const set = new Set<string>();
        lectures.forEach((l) => {
            if (l.chapter && l.chapter.trim()) {
                set.add(l.chapter.trim());
            }
        });
        return Array.from(set).sort();
    }, [lectures]);

    // Filtered & Ordered Lectures View
    const sortedAndFilteredLectures = useMemo(() => {
        return lectures
            .filter((lec) => {
                const matchSubj =
                    filterVideoSubject === "ALL" ||
                    lec.subject.toLowerCase() === filterVideoSubject.toLowerCase();
                const matchChap =
                    filterVideoChapter === "ALL" ||
                    lec.chapter.toLowerCase() === filterVideoChapter.toLowerCase();
                return matchSubj && matchChap;
            })
            .sort((a, b) => a.lecture_no - b.lecture_no);
    }, [lectures, filterVideoSubject, filterVideoChapter]);

    // Student Search Filtering
    const filteredStudents = useMemo(() => {
        return students.filter((s) => {
            const b = (s.batch_no && s.batch_no.trim()) || "General";
            const matchBatch = selectedBatch === "ALL" || b.toLowerCase() === selectedBatch.toLowerCase();

            const q = searchStudentQuery.toLowerCase().trim();
            const matchSearch =
                !q ||
                s.full_name.toLowerCase().includes(q) ||
                s.email.toLowerCase().includes(q) ||
                (s.school && s.school.toLowerCase().includes(q)) ||
                (s.grade_class && s.grade_class.toLowerCase().includes(q));

            return matchBatch && matchSearch;
        });
    }, [students, selectedBatch, searchStudentQuery]);

    const totalPaidInView = useMemo(
        () => filteredStudents.filter((s) => s.is_approved && s.days_left > 0).length,
        [filteredStudents]
    );
    const totalUnpaidInView = filteredStudents.length - totalPaidInView;

    // Student Actions
    const handleMarkPaid = async (studentId: string) => {
        setActionLoadingId(studentId);
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/students/${studentId}/approve-and-pay`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchStudents();
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleMarkUnpaid = async (studentId: string) => {
        if (!confirm("Are you sure you want to mark this student as Unpaid? Access will be revoked.")) return;
        setActionLoadingId(studentId);
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/students/${studentId}/revoke-access`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
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
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/students/${studentId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchStudents();
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    // Video Actions
    const handleCreateLecture = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/lectures`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(lectureForm),
            });
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
                alert(d.detail || "Failed to save lecture.");
            }
        } catch (err) {
            alert("Error saving lecture.");
        }
    };

    const handleUpdateLecture = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLecture) return;
        setSavingEdit(true);
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/lectures/${editingLecture.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(editingLecture),
            });
            if (res.ok) {
                alert("Lecture details updated successfully!");
                setEditingLecture(null);
                fetchLectures();
            } else {
                const d = await res.json();
                alert(d.detail || "Failed to update lecture.");
            }
        } catch (err) {
            alert("Error updating lecture.");
        } finally {
            setSavingEdit(false);
        }
    };

    // Feature 4: Move Lecture Up / Down in Sequence
    const handleSwapOrder = async (id1: string, id2: string) => {
        setReordering(true);
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/lectures/swap-order`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ lecture_id_1: id1, lecture_id_2: id2 }),
            });
            if (res.ok) {
                await fetchLectures();
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to reorder.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setReordering(false);
        }
    };

    // Feature 4: Auto-Renumber Active Chapter from 1..N
    const handleNormalizeChapter = async () => {
        if (filterVideoChapter === "ALL") {
            alert("Please select a specific chapter to auto-renumber.");
            return;
        }
        if (!confirm(`Auto-renumber all lectures in chapter "${filterVideoChapter}" from 1 to N?`)) return;

        setReordering(true);
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/lectures/normalize-order`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    subject: filterVideoSubject === "ALL" ? "PHYSICS" : filterVideoSubject,
                    chapter: filterVideoChapter,
                }),
            });
            if (res.ok) {
                alert("Chapter lectures sequentially renumbered!");
                await fetchLectures();
            }
        } catch (err) {
            alert("Failed to normalize sequence.");
        } finally {
            setReordering(false);
        }
    };

    const handleToggleLecturePublish = async (id: string) => {
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/lectures/${id}/toggle-publish`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchLectures();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteLecture = async (id: string) => {
        if (!confirm("Are you sure you want to delete this lecture?")) return;
        setActionLoadingId(id);
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/lectures/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchLectures();
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    // Sheet Actions
    const handleSubmitSheet = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = getToken();
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

                if (res.ok) {
                    alert("PDF uploaded successfully from PC!");
                    setSheetForm({ title: "", chapter: "", subject: "Physics", file_url: "" });
                    setSelectedFile(null);
                    fetchMaterials();
                } else {
                    const errData = await res.json();
                    alert(errData.detail || "Failed to upload PDF.");
                }
            } else {
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
                    body: JSON.stringify(sheetForm),
                });

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

    const handleUpdateMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMaterial) return;
        setSavingEdit(true);
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/materials/${editingMaterial.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(editingMaterial),
            });
            if (res.ok) {
                alert("Material sheet updated successfully!");
                setEditingMaterial(null);
                fetchMaterials();
            } else {
                const d = await res.json();
                alert(d.detail || "Failed to update material.");
            }
        } catch (err) {
            alert("Error updating material.");
        } finally {
            setSavingEdit(false);
        }
    };

    const handleToggleMaterialPublish = async (id: string) => {
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/materials/${id}/toggle-publish`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchMaterials();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm("Are you sure you want to delete this PDF material?")) return;
        setActionLoadingId(id);
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/api/v1/admin/materials/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchMaterials();
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
            <header className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur sticky top-0 z-30">
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
                            Batch Sheets & Fees
                        </button>
                        <button
                            onClick={() => setActiveTab("video")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "video" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Manage Videos & Ordering
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
                {/* TAB 1: BATCH SHEETS & FEES */}
                {activeTab === "students" && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Layers className="w-6 h-6 text-indigo-400" />
                                    <span>Batch Management & Fee Registry</span>
                                </h1>
                                <p className="text-slate-400 text-xs mt-1">
                                    Excel-style batch segregation, instant search, and real-time student lecture progress tracking.
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
                                    <span className="text-emerald-400 font-semibold">{totalPaidInView} Paid</span>
                                    <span className="text-slate-600">|</span>
                                    <span className="text-amber-400 font-semibold">{totalUnpaidInView} Due</span>
                                </div>
                                <button
                                    onClick={fetchStudents}
                                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-xl transition"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Refresh</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0f172a] p-3 rounded-2xl border border-slate-800">
                            <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
                                <button
                                    onClick={() => setSelectedBatch("ALL")}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${selectedBatch === "ALL"
                                            ? "bg-indigo-600 text-white shadow"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                                        }`}
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    <span>All Batches</span>
                                    <span className="px-1.5 py-0.2 bg-slate-950/60 rounded-full text-[10px] text-slate-300 font-mono">
                                        {students.length}
                                    </span>
                                </button>

                                {batchList.map((batchName) => {
                                    const count = students.filter(
                                        (s) => ((s.batch_no && s.batch_no.trim()) || "General").toLowerCase() === batchName.toLowerCase()
                                    ).length;

                                    return (
                                        <button
                                            key={batchName}
                                            onClick={() => setSelectedBatch(batchName)}
                                            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${selectedBatch.toLowerCase() === batchName.toLowerCase()
                                                    ? "bg-indigo-600 text-white shadow"
                                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                                                }`}
                                        >
                                            <span>{batchName}</span>
                                            <span className="px-1.5 py-0.2 bg-slate-950/60 rounded-full text-[10px] text-slate-300 font-mono">
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="relative min-w-[260px]">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Search student by name, email..."
                                    value={searchStudentQuery}
                                    onChange={(e) => setSearchStudentQuery(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="py-20 flex justify-center text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
                                No students found matching your criteria.
                            </div>
                        ) : (
                            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-900/90 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                                            <tr>
                                                <th className="py-3.5 px-4">#</th>
                                                <th className="py-3.5 px-4">Student Name</th>
                                                <th className="py-3.5 px-4">Email</th>
                                                <th className="py-3.5 px-4">Institution & Class</th>
                                                <th className="py-3.5 px-4">Batch</th>
                                                <th className="py-3.5 px-4">Lecture Progress</th>
                                                <th className="py-3.5 px-4">Payment Status</th>
                                                <th className="py-3.5 px-4">Days Left</th>
                                                <th className="py-3.5 px-4 text-right">Fee & Access Control</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60 font-sans">
                                            {filteredStudents.map((student, index) => {
                                                const isPaid = student.is_approved && student.days_left > 0;
                                                const totalLecs = lectures.length;
                                                const completedEstimate = isPaid ? Math.min(totalLecs, Math.max(1, Math.round(totalLecs * 0.4))) : 0;
                                                const progressPercent = totalLecs > 0 ? Math.round((completedEstimate / totalLecs) * 100) : 0;

                                                return (
                                                    <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                                                        <td className="py-3 px-4 font-mono text-slate-500">{index + 1}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="font-semibold text-white text-[13px]">{student.full_name}</div>
                                                        </td>
                                                        <td className="py-3 px-4 font-mono text-slate-400">{student.email}</td>
                                                        <td className="py-3 px-4 text-slate-300">
                                                            <div>{student.school || "N/A"}</div>
                                                            <div className="text-[10px] text-slate-500">{student.grade_class || "-"}</div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-[11px] font-mono text-indigo-300">
                                                                {student.batch_no || "General"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="space-y-1 min-w-[120px]">
                                                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                                    <span>{completedEstimate}/{totalLecs} Classes</span>
                                                                    <span className="font-mono text-indigo-400 font-bold">{progressPercent}%</span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all"
                                                                        style={{ width: `${progressPercent}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {isPaid ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    <span>Paid</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                    <span>Unpaid / Due</span>
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 font-mono text-xs">
                                                            {isPaid ? (
                                                                <span className="text-emerald-400 font-bold">{student.days_left} Days</span>
                                                            ) : (
                                                                <span className="text-rose-400 font-bold">0 Days</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex items-center justify-end space-x-2">
                                                                {!isPaid ? (
                                                                    <button
                                                                        onClick={() => handleMarkPaid(student.id)}
                                                                        disabled={actionLoadingId === student.id}
                                                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all flex items-center gap-1"
                                                                        title="Mark as Paid and grant 30-day access"
                                                                    >
                                                                        {actionLoadingId === student.id ? (
                                                                            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                                                        ) : (
                                                                            <span>Mark as Paid</span>
                                                                        )}
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleMarkUnpaid(student.id)}
                                                                        disabled={actionLoadingId === student.id}
                                                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-all flex items-center gap-1"
                                                                        title="Revoke active access and mark unpaid"
                                                                    >
                                                                        <span>Mark as Unpaid</span>
                                                                    </button>
                                                                )}

                                                                <button
                                                                    onClick={() => handleDeleteStudent(student.id, student.email)}
                                                                    disabled={actionLoadingId === student.id}
                                                                    className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white transition-all"
                                                                    title="Permanently delete account"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: VIDEOS MANAGEMENT & SEQUENCE MANAGER */}
                {activeTab === "video" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Create Form */}
                        <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl">
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
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Subject</label>
                                        <select
                                            value={lectureForm.subject}
                                            onChange={(e) => setLectureForm({ ...lectureForm, subject: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
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
                                        placeholder="e.g. আলোর প্রতিফলন"
                                        value={lectureForm.chapter}
                                        onChange={(e) => setLectureForm({ ...lectureForm, chapter: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Lecture Title / Topic</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Lecture 01 - Basics"
                                        value={lectureForm.title}
                                        onChange={(e) => setLectureForm({ ...lectureForm, title: e.target.value, topic: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
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
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg"
                                >
                                    Publish Lecture
                                </button>
                            </form>
                        </div>

                        {/* SEQUENCE & CHAPTER ORGANIZER */}
                        <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <ListOrdered className="w-5 h-5 text-indigo-400" />
                                        <span>Sequence & Chapter Manager</span>
                                    </h2>
                                    <p className="text-xs text-slate-400">Order lectures using Up/Down arrows or auto-renumber sequentially</p>
                                </div>
                                <button onClick={fetchLectures} className="text-xs text-slate-400 hover:text-white flex items-center space-x-1">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Refresh</span>
                                </button>
                            </div>

                            {/* Filters for sequence manager */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Subject</label>
                                    <select
                                        value={filterVideoSubject}
                                        onChange={(e) => setFilterVideoSubject(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                                    >
                                        <option value="ALL">All Subjects</option>
                                        <option value="Physics">Physics</option>
                                        <option value="Chemistry">Chemistry</option>
                                        <option value="Higher Math">Higher Math</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Chapter</label>
                                    <select
                                        value={filterVideoChapter}
                                        onChange={(e) => setFilterVideoChapter(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                                    >
                                        <option value="ALL">All Chapters ({uniqueChapters.length})</option>
                                        {uniqueChapters.map((ch) => (
                                            <option key={ch} value={ch}>
                                                {ch}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-end">
                                    <button
                                        onClick={handleNormalizeChapter}
                                        disabled={filterVideoChapter === "ALL" || reordering}
                                        className="w-full py-1.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40"
                                        title="Auto-renumber lectures in selected chapter 1, 2, 3..."
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Auto-Renumber (1..N)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Lectures List with Swap controls */}
                            {sortedAndFilteredLectures.length === 0 ? (
                                <p className="text-xs text-slate-400 py-8 text-center">No video lectures found in this filter.</p>
                            ) : (
                                <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                                    {sortedAndFilteredLectures.map((lec, idx) => {
                                        const isFirst = idx === 0;
                                        const isLast = idx === sortedAndFilteredLectures.length - 1;

                                        return (
                                            <div
                                                key={lec.id}
                                                className="bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 rounded-2xl p-3 flex items-center justify-between transition-all"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    {/* Re-order arrows */}
                                                    <div className="flex flex-col space-y-1">
                                                        <button
                                                            onClick={() => handleSwapOrder(lec.id, sortedAndFilteredLectures[idx - 1].id)}
                                                            disabled={isFirst || reordering}
                                                            className="p-1 rounded bg-slate-700/60 hover:bg-indigo-600 text-slate-300 disabled:opacity-20 transition"
                                                            title="Move Up"
                                                        >
                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSwapOrder(lec.id, sortedAndFilteredLectures[idx + 1].id)}
                                                            disabled={isLast || reordering}
                                                            className="p-1 rounded bg-slate-700/60 hover:bg-indigo-600 text-slate-300 disabled:opacity-20 transition"
                                                            title="Move Down"
                                                        >
                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center space-x-2 mb-0.5">
                                                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                                #{lec.lecture_no}
                                                            </span>
                                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                                                                {lec.subject}
                                                            </span>
                                                            {lec.is_published === false && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                                    Hidden
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="text-xs font-semibold text-white">{lec.title}</h4>
                                                        <p className="text-[11px] text-slate-400">{lec.chapter}</p>
                                                    </div>
                                                </div>

                                                {/* Edit & Actions */}
                                                <div className="flex items-center space-x-1.5">
                                                    <button
                                                        onClick={() => setEditingLecture(lec)}
                                                        className="p-2 rounded-xl bg-slate-700 text-slate-300 hover:text-indigo-400 transition"
                                                        title="Edit details"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleToggleLecturePublish(lec.id)}
                                                        className={`p-2 rounded-xl text-xs font-semibold border transition-all ${lec.is_published === false
                                                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                                                : "bg-slate-700 border-slate-600 text-slate-300 hover:text-white"
                                                            }`}
                                                        title={lec.is_published === false ? "Publish" : "Unpublish"}
                                                    >
                                                        {lec.is_published === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>

                                                    <a
                                                        href={lec.video_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-2 rounded-xl bg-slate-700 text-slate-300 hover:text-white"
                                                        title="Watch video"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>

                                                    <button
                                                        onClick={() => handleDeleteLecture(lec.id)}
                                                        disabled={actionLoadingId === lec.id}
                                                        className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white"
                                                        title="Delete permanently"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: SHEETS MANAGEMENT */}
                {activeTab === "sheet" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <h2 className="text-lg font-bold text-white mb-2">Upload Lecture Sheet</h2>
                            <p className="text-xs text-slate-400 mb-4">Choose whether to upload from your PC or paste a Drive link</p>

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
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
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
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
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
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                    />
                                </div>

                                {uploadMode === "file" ? (
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Select PDF File from Computer</label>
                                        <input
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            required
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
                                            required
                                            placeholder="https://drive.google.com/file/d/..."
                                            value={sheetForm.file_url}
                                            onChange={(e) => setSheetForm({ ...sheetForm, file_url: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
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
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <span>{uploadMode === "file" ? "Upload PDF to Server" : "Save Drive Link"}</span>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Published Sheets List */}
                        <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl">
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
                                                            Hidden
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-semibold text-white">{mat.title}</h4>
                                                <p className="text-xs text-slate-400">{mat.chapter}</p>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => setEditingMaterial(mat)}
                                                    className="p-2 rounded-xl bg-slate-700 border border-slate-600 text-slate-300 hover:text-indigo-400 transition"
                                                    title="Edit sheet details"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleToggleMaterialPublish(mat.id)}
                                                    className={`p-2 rounded-xl text-xs font-semibold border transition-all ${mat.is_published === false
                                                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                                            : "bg-slate-700 border-slate-600 text-slate-300 hover:text-white"
                                                        }`}
                                                    title={mat.is_published === false ? "Publish" : "Unpublish"}
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
                                                    className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white"
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

            {/* Edit Lecture Modal */}
            {editingLecture && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Edit2 className="w-4 h-4 text-indigo-400" />
                                <span>Edit Video Lecture</span>
                            </h3>
                            <button
                                onClick={() => setEditingLecture(null)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateLecture} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Lecture Number</label>
                                    <input
                                        type="number"
                                        required
                                        value={editingLecture.lecture_no}
                                        onChange={(e) => setEditingLecture({ ...editingLecture, lecture_no: Number(e.target.value) })}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Subject</label>
                                    <select
                                        value={editingLecture.subject}
                                        onChange={(e) => setEditingLecture({ ...editingLecture, subject: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
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
                                    value={editingLecture.chapter}
                                    onChange={(e) => setEditingLecture({ ...editingLecture, chapter: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Topic / Title</label>
                                <input
                                    type="text"
                                    required
                                    value={editingLecture.title}
                                    onChange={(e) => setEditingLecture({ ...editingLecture, title: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">YouTube URL</label>
                                <input
                                    type="url"
                                    required
                                    value={editingLecture.video_url}
                                    onChange={(e) => setEditingLecture({ ...editingLecture, video_url: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingLecture(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg"
                                >
                                    {savingEdit ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Material Modal */}
            {editingMaterial && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-indigo-400" />
                                <span>Edit Study Material Sheet</span>
                            </h3>
                            <button
                                onClick={() => setEditingMaterial(null)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateMaterial} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Subject</label>
                                <select
                                    value={editingMaterial.subject}
                                    onChange={(e) => setEditingMaterial({ ...editingMaterial, subject: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
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
                                    value={editingMaterial.chapter}
                                    onChange={(e) => setEditingMaterial({ ...editingMaterial, chapter: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Material Title</label>
                                <input
                                    type="text"
                                    required
                                    value={editingMaterial.title}
                                    onChange={(e) => setEditingMaterial({ ...editingMaterial, title: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">PDF File / Google Drive URL</label>
                                <input
                                    type="url"
                                    required
                                    value={editingMaterial.file_url}
                                    onChange={(e) => setEditingMaterial({ ...editingMaterial, file_url: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingMaterial(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg"
                                >
                                    {savingEdit ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}