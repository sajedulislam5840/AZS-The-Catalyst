"use client";

import React, { useState, useEffect, useMemo, FormEvent, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Video,
    FileText,
    LogOut,
    Plus,
    Trash2,
    ExternalLink,
    ShieldAlert,
    CheckCircle2,
    Atom,
    FlaskConical,
    X,
    Search,
    Bell,
    Sparkles,
    BookOpen,
    Calendar,
    Layers,
    Settings,
    ChevronRight,
    Filter,
} from "lucide-react";
import axios from "axios";

const BACKEND_URL = (
    process.env.NEXT_PUBLIC_API_URL || "https://edutrack-backend-qjxg.onrender.com"
).replace(/\/$/, "");

const api = axios.create({
    baseURL: BACKEND_URL,
});

api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    batch_no?: string;
    grade_class?: string;
    role?: string;
    school?: string;
}

interface VideoLecture {
    id: string;
    lecture_no: number;
    topic: string;
    title?: string;
    chapter: string;
    subject: string;
    youtube_url: string;
    video_url?: string;
}

interface Material {
    id: string;
    title: string;
    chapter: string;
    subject: string;
    pdf_url?: string;
    file_url?: string;
}

interface Notice {
    id: string;
    content: string;
    created_at: string;
}

function AdminContent() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "lectures" | "materials" | "students" | "notices">("overview");

    const [adminName, setAdminName] = useState("Admin");
    const [videos, setVideos] = useState<VideoLecture[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    // Search & Filtering States
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
    const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("ALL");

    // Form States for Video Upload
    const [videoSubject, setVideoSubject] = useState<"PHYSICS" | "CHEMISTRY">("PHYSICS");
    const [videoChapter, setVideoChapter] = useState("");
    const [videoLectureNo, setVideoLectureNo] = useState("1");
    const [videoTopic, setVideoTopic] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [uploadingVideo, setUploadingVideo] = useState(false);

    // Form States for Material Upload
    const [materialSubject, setMaterialSubject] = useState<"PHYSICS" | "CHEMISTRY">("PHYSICS");
    const [materialChapter, setMaterialChapter] = useState("");
    const [materialTitle, setMaterialTitle] = useState("");
    const [materialPdfUrl, setMaterialPdfUrl] = useState("");
    const [uploadingMaterial, setUploadingMaterial] = useState(false);

    // Form States for Notice
    const [noticeContent, setNoticeContent] = useState("");
    const [publishingNotice, setPublishingNotice] = useState(false);

    useEffect(() => {
        setMounted(true);
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        if (!token) {
            router.replace("/login");
            return;
        }

        const role = (localStorage.getItem("user_role") || "").toUpperCase();
        const email = (localStorage.getItem("user_email") || "").toLowerCase();
        const storedName = localStorage.getItem("user_name") || "Admin";
        setAdminName(storedName);

        if (role !== "ADMIN" && email !== "rabbi@edutrack.com") {
            router.replace("/dashboard");
            return;
        }

        fetchAllAdminData();
    }, [router]);

    const fetchAllAdminData = async () => {
        try {
            setLoading(true);
            const [vRes, mRes, sRes, nRes] = await Promise.allSettled([
                api.get("/api/v1/academic/videos"),
                api.get("/api/v1/academic/materials"),
                api.get("/api/v1/auth/users"),
                api.get("/api/v1/academic/notice"),
            ]);

            if (vRes.status === "fulfilled" && Array.isArray(vRes.value.data)) {
                setVideos(vRes.value.data);
            }
            if (mRes.status === "fulfilled" && Array.isArray(mRes.value.data)) {
                setMaterials(mRes.value.data);
            }
            if (sRes.status === "fulfilled" && Array.isArray(sRes.value.data)) {
                setStudents(sRes.value.data);
            }
            if (nRes.status === "fulfilled" && nRes.value.data) {
                setNotices([nRes.value.data]);
            }
        } catch (err) {
            console.error("Admin fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadVideo = async (e: FormEvent) => {
        e.preventDefault();
        if (!videoChapter || !videoTopic || !videoUrl) return;

        try {
            setUploadingVideo(true);
            await api.post("/api/v1/academic/videos", {
                subject: videoSubject,
                chapter: videoChapter.trim(),
                lecture_no: parseInt(videoLectureNo) || 1,
                topic: videoTopic.trim(),
                youtube_url: videoUrl.trim(),
            });

            setVideoTopic("");
            setVideoUrl("");
            setVideoChapter("");
            fetchAllAdminData();
            alert("Video Lecture successfully published!");
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to upload video lecture.");
        } finally {
            setUploadingVideo(false);
        }
    };

    const handleDeleteVideo = async (id: string) => {
        if (!confirm("Are you sure you want to delete this lecture?")) return;
        try {
            await api.delete(`/api/v1/academic/videos/${id}`);
            setVideos(videos.filter((v) => v.id !== id));
        } catch {
            alert("Failed to delete lecture.");
        }
    };

    const handleUploadMaterial = async (e: FormEvent) => {
        e.preventDefault();
        if (!materialChapter || !materialTitle || !materialPdfUrl) return;

        try {
            setUploadingMaterial(true);
            await api.post("/api/v1/academic/materials", {
                subject: materialSubject,
                chapter: materialChapter.trim(),
                title: materialTitle.trim(),
                pdf_url: materialPdfUrl.trim(),
            });

            setMaterialTitle("");
            setMaterialPdfUrl("");
            setMaterialChapter("");
            fetchAllAdminData();
            alert("Study Material successfully published!");
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to upload study material.");
        } finally {
            setUploadingMaterial(false);
        }
    };

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm("Are you sure you want to delete this material?")) return;
        try {
            await api.delete(`/api/v1/academic/materials/${id}`);
            setMaterials(materials.filter((m) => m.id !== id));
        } catch {
            alert("Failed to delete material.");
        }
    };

    const handlePublishNotice = async (e: FormEvent) => {
        e.preventDefault();
        if (!noticeContent.trim()) return;

        try {
            setPublishingNotice(true);
            await api.post("/api/v1/academic/notice", {
                content: noticeContent.trim(),
            });
            setNoticeContent("");
            fetchAllAdminData();
            alert("Live notice successfully updated!");
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to publish notice.");
        } finally {
            setPublishingNotice(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        router.replace("/login");
    };

    const filteredVideos = useMemo(() => {
        return videos.filter((v) => {
            const matchSubj = selectedSubjectFilter === "ALL" || v.subject === selectedSubjectFilter;
            const query = searchQuery.toLowerCase();
            const matchSearch =
                !query ||
                (v.topic && v.topic.toLowerCase().includes(query)) ||
                (v.title && v.title.toLowerCase().includes(query)) ||
                (v.chapter && v.chapter.toLowerCase().includes(query));
            return matchSubj && matchSearch;
        });
    }, [videos, selectedSubjectFilter, searchQuery]);

    const filteredMaterials = useMemo(() => {
        return materials.filter((m) => {
            const matchSubj = selectedSubjectFilter === "ALL" || m.subject === selectedSubjectFilter;
            const query = searchQuery.toLowerCase();
            const matchSearch =
                !query ||
                (m.title && m.title.toLowerCase().includes(query)) ||
                (m.chapter && m.chapter.toLowerCase().includes(query));
            return matchSubj && matchSearch;
        });
    }, [materials, selectedSubjectFilter, searchQuery]);

    const filteredStudents = useMemo(() => {
        return students.filter((st) => {
            const matchBatch = selectedBatchFilter === "ALL" || st.batch_no === selectedBatchFilter;
            const query = searchQuery.toLowerCase();
            const matchSearch =
                !query ||
                (st.full_name && st.full_name.toLowerCase().includes(query)) ||
                (st.email && st.email.toLowerCase().includes(query)) ||
                (st.school && st.school.toLowerCase().includes(query));
            return matchBatch && matchSearch;
        });
    }, [students, selectedBatchFilter, searchQuery]);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans antialiased">
            <div className="flex-1 flex min-w-0">

                {/* ADMIN SIDEBAR */}
                <aside className="w-72 bg-[#0B101D] border-r border-slate-800/80 p-6 flex flex-col justify-between shrink-0 hidden md:flex shadow-2xl">
                    <div className="space-y-8">
                        <div className="flex items-center space-x-3 px-1">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                                AZS
                            </div>
                            <div>
                                <span className="font-extrabold text-sm tracking-tight text-white block leading-tight">AZS Admin</span>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block">
                                    Command Center
                                </span>
                            </div>
                        </div>

                        <nav className="space-y-1.5">
                            <button
                                onClick={() => { setActiveTab("overview"); setSearchQuery(""); }}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "overview"
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                        : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                <span>Admin Overview</span>
                            </button>

                            <button
                                onClick={() => { setActiveTab("lectures"); setSearchQuery(""); }}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "lectures"
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                        : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                                    }`}
                            >
                                <Video className="w-4 h-4" />
                                <span>Manage Lectures</span>
                                <span className="ml-auto text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                                    {videos.length}
                                </span>
                            </button>

                            <button
                                onClick={() => { setActiveTab("materials"); setSearchQuery(""); }}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "materials"
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                        : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                                    }`}
                            >
                                <FileText className="w-4 h-4" />
                                <span>Study Sheets (PDF)</span>
                                <span className="ml-auto text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                                    {materials.length}
                                </span>
                            </button>

                            <button
                                onClick={() => { setActiveTab("students"); setSearchQuery(""); }}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "students"
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                        : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                <span>Student Directory</span>
                                <span className="ml-auto text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                                    {students.length}
                                </span>
                            </button>

                            <button
                                onClick={() => { setActiveTab("notices"); setSearchQuery(""); }}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "notices"
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                        : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                                    }`}
                            >
                                <Bell className="w-4 h-4" />
                                <span>Live Notices</span>
                            </button>
                        </nav>
                    </div>

                    <div className="pt-6 border-t border-slate-800/80 space-y-3">
                        <div className="flex items-center space-x-3 px-2">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-extrabold text-indigo-400 text-xs shadow-sm shrink-0">
                                {adminName.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-white truncate">{adminName}</p>
                                <p className="text-[10px] text-slate-400 font-medium truncate">System Administrator</p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* ADMIN MAIN CONTENT */}
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                    <header className="h-20 bg-[#090D16]/80 backdrop-blur-md border-b border-slate-800/80 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                        <div className="flex items-center gap-3 flex-1 max-w-md">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-xs shadow md:hidden">
                                AZS
                            </div>
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    placeholder="Search records..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#131826] border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-3 text-slate-400 hover:text-white"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition flex md:hidden items-center gap-1.5"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Logout</span>
                        </button>
                    </header>

                    <main className="p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8 flex-1 pb-24">

                        {/* TAB: OVERVIEW */}
                        {activeTab === "overview" && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">Admin Overview</h2>
                                    <p className="text-xs text-slate-400">Platform statistics, content distribution, and activity telemetry.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="bg-[#0B101D] rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                                            <Video className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-black text-white">{videos.length}</p>
                                            <p className="text-xs text-slate-400 font-medium mt-1">Total Video Lectures</p>
                                        </div>
                                    </div>

                                    <div className="bg-[#0B101D] rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
                                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-black text-white">{materials.length}</p>
                                            <p className="text-xs text-slate-400 font-medium mt-1">Study Sheets & Handouts</p>
                                        </div>
                                    </div>

                                    <div className="bg-[#0B101D] rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-black text-white">{students.length}</p>
                                            <p className="text-xs text-slate-400 font-medium mt-1">Registered Students</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: MANAGE LECTURES */}
                        {activeTab === "lectures" && (
                            <div className="space-y-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight">Upload & Manage Lectures</h2>
                                        <p className="text-xs text-slate-400">Add chapter-wise video lectures for Physics and Chemistry.</p>
                                    </div>

                                    <div className="flex items-center gap-1.5 bg-[#0B101D] p-1 rounded-xl border border-slate-800 shadow-sm">
                                        {(["ALL", "PHYSICS", "CHEMISTRY"] as const).map((subj) => (
                                            <button
                                                key={subj}
                                                onClick={() => setSelectedSubjectFilter(subj)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedSubjectFilter === subj
                                                        ? "bg-indigo-600 text-white shadow-md"
                                                        : "text-slate-400 hover:text-white"
                                                    }`}
                                            >
                                                {subj === "ALL" ? "All Subjects" : subj}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <form onSubmit={handleUploadVideo} className="bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-5">
                                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Publish New Lecture</h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300">Subject</label>
                                            <select
                                                value={videoSubject}
                                                onChange={(e) => setVideoSubject(e.target.value as "PHYSICS" | "CHEMISTRY")}
                                                className="w-full bg-[#131826] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="PHYSICS">PHYSICS</option>
                                                <option value="CHEMISTRY">CHEMISTRY</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300">Chapter Name</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Reflection of Light"
                                                value={videoChapter}
                                                onChange={(e) => setVideoChapter(e.target.value)}
                                                className="w-full bg-[#131826] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300">Lecture No.</label>
                                            <input
                                                type="number"
                                                required
                                                value={videoLectureNo}
                                                onChange={(e) => setVideoLectureNo(e.target.value)}
                                                className="w-full bg-[#131826] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300">Topic Title</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Snell's Law & Refractive Index"
                                                value={videoTopic}
                                                onChange={(e) => setVideoTopic(e.target.value)}
                                                className="w-full bg-[#131826] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300">YouTube Embed / Watch URL</label>
                                            <input
                                                type="url"
                                                required
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                value={videoUrl}
                                                onChange={(e) => setVideoUrl(e.target.value)}
                                                className="w-full bg-[#131826] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={uploadingVideo}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>{uploadingVideo ? "Publishing..." : "Publish Lecture"}</span>
                                    </button>
                                </form>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Uploaded Lectures ({filteredVideos.length})</h3>
                                    <div className="bg-[#0B101D] rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                                        <div className="divide-y divide-slate-800">
                                            {filteredVideos.length === 0 ? (
                                                <div className="p-8 text-center text-xs text-slate-400">No lectures found.</div>
                                            ) : (
                                                filteredVideos.map((vid) => (
                                                    <div key={vid.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                                                        <div className="space-y-1 overflow-hidden">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                                                                    Lecture #{vid.lecture_no}
                                                                </span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${vid.subject === "PHYSICS" ? "bg-indigo-500/10 text-indigo-300" : "bg-amber-500/10 text-amber-300"}`}>
                                                                    {vid.subject}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 truncate">{vid.chapter}</span>
                                                            </div>
                                                            <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">{vid.topic || vid.title}</h4>
                                                        </div>

                                                        <button
                                                            onClick={() => handleDeleteVideo(vid.id)}
                                                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition border border-rose-500/20 shrink-0"
                                                            title="Delete Lecture"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: STUDY MATERIALS (PDF) */}
                        {activeTab === "materials" && (
                            <div className="space-y-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight">Upload Study Sheets (PDF)</h2>
                                        <p className="text-xs text-slate-400">Add downloadable PDF handouts and notes for chapters.</p>
                                    </div>

                                    <div className="flex items-center gap-1.5 bg-[#0B101D] p-1 rounded-xl border border-slate-800 shadow-sm">
                                        {(["ALL", "PHYSICS", "CHEMISTRY"] as const).map((subj) => (
                                            <button
                                                key={subj}
                                                onClick={() => setSelectedSubjectFilter(subj)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedSubjectFilter === subj
                                                        ? "bg-indigo-600 text-white shadow-md"
                                                        : "text-slate-400 hover:text-white"
                                                    }`}
                                            >
                                                {subj === "ALL" ? "All Subjects" : subj}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <form onSubmit={handleUploadMaterial} className="bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-5">
                                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Publish New PDF Sheet</h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300">Subject</label>
                                            <select
                                                value={materialSubject}
                                                onChange={(e) => setMaterialSubject(e.target.value as "PHYSICS" | "CHEMISTRY")}
                                                className="w-full bg-[#131826] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="PHYSICS">PHYSICS</option>
                                                <option value="CHEMISTRY">CHEMISTRY</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300">Chapter Name</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Reflection of Light"
                                                value={materialChapter}
                                                onChange={(e) => setMaterialChapter(e.target.value)}
                                                className="w-full bg-[#131826] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300">Document Title</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Chapter 01 Handout & Formula Sheet"
                                                value={materialTitle}
                                                onChange={(e) => setMaterialTitle(e.target.value)}
                                                className="w-full bg-[#131826] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300">Google Drive / PDF URL</label>
                                            <input
                                                type="url"
                                                required
                                                placeholder="https://drive.google.com/file/d/..."
                                                value={materialPdfUrl}
                                                onChange={(e) => setMaterialPdfUrl(e.target.value)}
                                                className="w-full bg-[#131826] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={uploadingMaterial}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>{uploadingMaterial ? "Publishing..." : "Publish PDF Sheet"}</span>
                                    </button>
                                </form>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Uploaded Sheets ({filteredMaterials.length})</h3>
                                    <div className="bg-[#0B101D] rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                                        <div className="divide-y divide-slate-800">
                                            {filteredMaterials.length === 0 ? (
                                                <div className="p-8 text-center text-xs text-slate-400">No study materials found.</div>
                                            ) : (
                                                filteredMaterials.map((mat) => (
                                                    <div key={mat.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                                                        <div className="space-y-1 overflow-hidden">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${mat.subject === "PHYSICS" ? "bg-indigo-500/10 text-indigo-300" : "bg-amber-500/10 text-amber-300"}`}>
                                                                    {mat.subject}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 truncate">{mat.chapter}</span>
                                                            </div>
                                                            <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">{mat.title}</h4>
                                                        </div>

                                                        <button
                                                            onClick={() => handleDeleteMaterial(mat.id)}
                                                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition border border-rose-500/20 shrink-0"
                                                            title="Delete Material"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: STUDENT DIRECTORY */}
                        {activeTab === "students" && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">Student Directory</h2>
                                    <p className="text-xs text-slate-400">View registered students and batch information.</p>
                                </div>

                                <div className="bg-[#0B101D] rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                                    <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                                        <h3 className="text-sm font-extrabold text-white">Registered Accounts ({filteredStudents.length})</h3>
                                    </div>

                                    <div className="divide-y divide-slate-800">
                                        {filteredStudents.length === 0 ? (
                                            <div className="p-8 text-center text-xs text-slate-400">No student records found.</div>
                                        ) : (
                                            filteredStudents.map((st) => (
                                                <div key={st.id || st.email} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                                                    <div className="flex items-center space-x-3.5">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-xs shrink-0">
                                                            {(st.full_name || "S").charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">{st.full_name || "Student"}</h4>
                                                            <p className="text-[11px] text-slate-400 truncate">{st.email}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-xl">
                                                            {st.batch_no || "General Batch"}
                                                        </span>
                                                        <span className="text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-xl">
                                                            {st.role || "STUDENT"}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: LIVE NOTICES */}
                        {activeTab === "notices" && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">Broadcast Live Notice</h2>
                                    <p className="text-xs text-slate-400">Publish or update the live notification ticker on student dashboards.</p>
                                </div>

                                <form onSubmit={handlePublishNotice} className="bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-5">
                                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Update Announcement Ticker</h3>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Notice Text</label>
                                        <textarea
                                            rows={3}
                                            required
                                            placeholder="e.g. Physics Live Exam on Sunday at 8:00 PM!"
                                            value={noticeContent}
                                            onChange={(e) => setNoticeContent(e.target.value)}
                                            className="w-full bg-[#131826] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={publishingNotice}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>{publishingNotice ? "Broadcasting..." : "Publish Live Notice"}</span>
                                    </button>
                                </form>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Current Broadcast Status</h3>
                                    <div className="bg-[#0B101D] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-3">
                                        {notices.length === 0 ? (
                                            <p className="text-xs text-slate-400">No active notice broadcasted right now.</p>
                                        ) : (
                                            notices.map((n, idx) => (
                                                <div key={idx} className="p-4 rounded-2xl bg-[#131826] border border-slate-800 flex items-center justify-between">
                                                    <p className="text-xs font-bold text-white">{n.content}</p>
                                                    <span className="text-[10px] text-emerald-400 font-mono">Active</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    </main>
                </div>
            </div>
        </div>
    );
}

export default function AdminPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#090D16] flex flex-col items-center justify-center space-y-3">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                    <p className="text-xs font-bold text-slate-400 tracking-wide font-mono">INITIALIZING ADMIN CONSOLE...</p>
                </div>
            }
        >
            <AdminContent />
        </Suspense>
    );
}