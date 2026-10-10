"use client";

import React, { useState, useEffect, useMemo, useRef, FormEvent, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    PlayCircle,
    FileText,
    Bot,
    LogOut,
    Flame,
    CheckCircle2,
    Calendar as CalendarIcon,
    Search,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Bell,
    Sparkles,
    BookOpen,
    CalendarCheck,
    SearchX,
    X,
    Plus,
    Trash2,
    Clock,
    Play,
    FileEdit,
    Download,
    ChevronDown,
    ChevronUp,
    Eye,
    MessageSquare,
    Send,
    MessageCircle,
    Globe,
    Video,
} from "lucide-react";
import axios from "axios";

// --- Professional Teacher Social Config ---
const TEACHER_SOCIAL = {
    name: "AZS RAZON SIR",
    role: "Lead Physics & Chemistry Instructor",
    whatsapp: "https://wa.me/8801916201426",
    facebook: "https://www.facebook.com/razon.sikdar.1",
    youtube: "https://www.youtube.com/@AZSChemistry",
};

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
    school?: string;
    grade_class?: string;
    batch_no?: string;
    role?: string;
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

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

interface StudyPlan {
    id: string;
    dateKey: string;
    title: string;
    time?: string;
}

function getYouTubeEmbedUrl(url: string) {
    if (!url) return "";
    try {
        let videoId = "";
        if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
        } else if (url.includes("youtube.com/watch")) {
            const urlParams = new URLSearchParams(url.split("?")[1]);
            videoId = urlParams.get("v") || "";
        } else if (url.includes("youtube.com/embed/")) {
            videoId = url.split("youtube.com/embed/")[1]?.split("?")[0] || "";
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    } catch {
        return url;
    }
}

function getDrivePreviewUrl(url: string) {
    if (!url) return "";
    try {
        if (url.includes("drive.google.com/file/d/")) {
            const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                return `https://drive.google.com/file/d/${match[1]}/preview`;
            }
        }
        if (url.includes("drive.google.com/open?id=")) {
            const id = url.split("id=")[1]?.split("&")[0];
            if (id) return `https://drive.google.com/file/d/${id}/preview`;
        }
        return url;
    } catch {
        return url;
    }
}

function DashboardContent() {
    const router = useRouter();
    const [activeNav, setActiveNav] = useState<"dashboard" | "lectures" | "materials" | "ai">("dashboard");
    const [mounted, setMounted] = useState(false);
    const [currentYear, setCurrentYear] = useState(2026);

    // Floating AI Chat States
    const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);

    const [userProfile, setUserProfile] = useState<UserProfile>({
        id: "",
        full_name: "Student",
        email: "",
        school: "",
        grade_class: "",
        batch_no: "Registered Student",
        role: "STUDENT",
    });

    const [videos, setVideos] = useState<VideoLecture[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [watchedVideos, setWatchedVideos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [lastPlayedId, setLastPlayedId] = useState<string>("");

    const [openNotesId, setOpenNotesId] = useState<string | null>(null);
    const [lectureNotes, setLectureNotes] = useState<Record<string, string>>({});
    const [saveStatus, setSaveStatus] = useState<Record<string, boolean>>({});

    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [previewPdfTitle, setPreviewPdfTitle] = useState<string>("");

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content: "Hello! I am your AZS AI Academic Tutor. Feel free to ask any Physics or Chemistry doubts!",
        },
    ]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [calendarViewDate, setCalendarViewDate] = useState<Date | null>(null);
    const [todayKey, setTodayKey] = useState<string>("");
    const [tomorrowKey, setTomorrowKey] = useState<string>("");
    const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
    const [selectedDateForPlan, setSelectedDateForPlan] = useState<string | null>(null);
    const [newPlanTitle, setNewPlanTitle] = useState("");
    const [newPlanTime, setNewPlanTime] = useState("");

    const formatDateKey = (year: number, month: number, day: number) => {
        const m = String(month + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        return `${year}-${m}-${d}`;
    };

    useEffect(() => {
        setMounted(true);
        setCurrentYear(new Date().getFullYear());

        const now = new Date();
        setCalendarViewDate(new Date(now.getFullYear(), now.getMonth(), 1));

        const todayStr = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
        setTodayKey(todayStr);

        const tmrw = new Date(now);
        tmrw.setDate(tmrw.getDate() + 1);
        const tmrwStr = formatDateKey(tmrw.getFullYear(), tmrw.getMonth(), tmrw.getDate());
        setTomorrowKey(tmrwStr);

        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        if (!token) {
            router.replace("/login");
            return;
        }

        const role = (localStorage.getItem("user_role") || "").toUpperCase();
        const email = (localStorage.getItem("user_email") || "").toLowerCase();

        if (role === "ADMIN" || email === "rabbi@edutrack.com") {
            router.replace("/admin");
            return;
        }

        const storedName = localStorage.getItem("user_name") || localStorage.getItem("student_name") || "Student";
        const storedEmail = localStorage.getItem("user_email") || "";
        const storedBatch = localStorage.getItem("batch_no") || "General Batch";
        const storedClass = localStorage.getItem("grade_class") || "";
        const storedSchool = localStorage.getItem("school") || "";

        setUserProfile({
            id: "",
            full_name: storedName,
            email: storedEmail,
            batch_no: storedBatch,
            grade_class: storedClass,
            school: storedSchool,
            role: role,
        });

        const storedWatched = localStorage.getItem("edutrack_watched_videos");
        if (storedWatched) {
            try {
                setWatchedVideos(JSON.parse(storedWatched));
            } catch {
                setWatchedVideos([]);
            }
        }

        const storedPlans = localStorage.getItem("edutrack_study_plans");
        if (storedPlans) {
            try {
                setStudyPlans(JSON.parse(storedPlans));
            } catch {
                setStudyPlans([]);
            }
        }

        const storedLastPlayed = localStorage.getItem("edutrack_last_played_id");
        if (storedLastPlayed) {
            setLastPlayedId(storedLastPlayed);
        }

        const storedNotes = localStorage.getItem("edutrack_lecture_notes");
        if (storedNotes) {
            try {
                setLectureNotes(JSON.parse(storedNotes));
            } catch {
                setLectureNotes({});
            }
        }

        fetchUserData();
        fetchAcademicData();
    }, [router]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, isFloatingChatOpen]);

    const fetchUserData = async () => {
        try {
            const res = await api.get("/api/v1/auth/me");
            if (res.data) {
                const isAdmin = Boolean(
                    res.data.is_admin ||
                    String(res.data.role).toUpperCase() === "ADMIN" ||
                    res.data.email === "rabbi@edutrack.com"
                );

                if (isAdmin) {
                    router.replace("/admin");
                    return;
                }

                setUserProfile((prev) => ({
                    ...prev,
                    full_name: res.data.full_name || prev.full_name,
                    email: res.data.email || prev.email,
                    batch_no: res.data.batch_no || prev.batch_no,
                    grade_class: res.data.grade_class || prev.grade_class,
                    school: res.data.school || prev.school,
                }));
                if (res.data.full_name) localStorage.setItem("user_name", res.data.full_name);
                if (res.data.batch_no) localStorage.setItem("batch_no", res.data.batch_no);
            }
        } catch {
            // Retain stored local values
        }
    };

    const fetchAcademicData = async () => {
        try {
            setLoading(true);

            let videoData: VideoLecture[] = [];
            try {
                const vRes = await api.get("/api/v1/academic/videos");
                if (Array.isArray(vRes.data) && vRes.data.length > 0) {
                    videoData = vRes.data;
                }
            } catch {
                try {
                    const lRes = await api.get("/api/v1/academic/lectures");
                    if (Array.isArray(lRes.data)) {
                        videoData = lRes.data;
                    }
                } catch {
                    videoData = [];
                }
            }

            setVideos(videoData);

            const [mRes, nRes] = await Promise.allSettled([
                api.get("/api/v1/academic/materials"),
                api.get("/api/v1/academic/notice"),
            ]);

            if (mRes.status === "fulfilled" && Array.isArray(mRes.value.data)) {
                setMaterials(mRes.value.data);
            }
            if (nRes.status === "fulfilled" && nRes.value.data) {
                setNotice(nRes.value.data);
            }
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleWatchStatus = (id: string) => {
        const updated = watchedVideos.includes(id)
            ? watchedVideos.filter((vId) => vId !== id)
            : [...watchedVideos, id];
        setWatchedVideos(updated);
        localStorage.setItem("edutrack_watched_videos", JSON.stringify(updated));
    };

    const recordLecturePlayback = (id: string) => {
        setLastPlayedId(id);
        localStorage.setItem("edutrack_last_played_id", id);
    };

    const handleResumeLecture = (targetId?: string) => {
        const idToOpen = targetId || lastPlayedId || (videos.length > 0 ? videos[0].id : "");
        if (!idToOpen) return;
        setActiveNav("lectures");
        recordLecturePlayback(idToOpen);
        setTimeout(() => {
            const element = document.getElementById(`lecture-card-${idToOpen}`);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }, 150);
    };

    const handleNoteChange = (lectureId: string, content: string) => {
        const updated = { ...lectureNotes, [lectureId]: content };
        setLectureNotes(updated);
        localStorage.setItem("edutrack_lecture_notes", JSON.stringify(updated));
        setSaveStatus((prev) => ({ ...prev, [lectureId]: true }));
        setTimeout(() => {
            setSaveStatus((prev) => ({ ...prev, [lectureId]: false }));
        }, 1500);
    };

    const handleAddTimestampTag = (lectureId: string) => {
        const current = lectureNotes[lectureId] || "";
        const stamp = `\n[Timestamp Note]: `;
        handleNoteChange(lectureId, current + stamp);
    };

    const handleExportNotes = (lecture: VideoLecture) => {
        const noteText = lectureNotes[lecture.id] || "No notes recorded for this lecture.";
        const blob = new Blob(
            [
                `AZS: The Catalyst - Revision Notes\n`,
                `Subject: ${lecture.subject}\n`,
                `Chapter: ${lecture.chapter}\n`,
                `Lecture #${lecture.lecture_no}: ${lecture.topic || lecture.title}\n`,
                `----------------------------------------\n\n`,
                noteText,
            ],
            { type: "text/plain;charset=utf-8" }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Lecture_${lecture.lecture_no}_Notes.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleSendChat = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        const prompt = chatInput.trim();
        if (!prompt || chatLoading) return;

        const newMsgs: ChatMessage[] = [...chatMessages, { role: "user", content: prompt }];
        setChatMessages(newMsgs);
        setChatInput("");
        setChatLoading(true);

        try {
            const res = await api.post("/api/v1/ai/chat", { prompt });
            setChatMessages([...newMsgs, { role: "assistant", content: res.data.reply }]);
        } catch (err: any) {
            setChatMessages([
                ...newMsgs,
                {
                    role: "assistant",
                    content: err.response?.data?.detail || "Could not retrieve AI response right now.",
                },
            ]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        router.replace("/login");
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYearCalendar = calendarViewDate ? calendarViewDate.getFullYear() : 2026;
    const currentMonthCalendar = calendarViewDate ? calendarViewDate.getMonth() : 9;
    const currentMonthTitle = `${monthNames[currentMonthCalendar]} ${currentYearCalendar}`;

    const daysInMonth = new Date(currentYearCalendar, currentMonthCalendar + 1, 0).getDate();
    const startDayOfMonth = new Date(currentYearCalendar, currentMonthCalendar, 1).getDay();

    const handlePrevMonth = () => {
        setCalendarViewDate(new Date(currentYearCalendar, currentMonthCalendar - 1, 1));
    };

    const handleNextMonth = () => {
        setCalendarViewDate(new Date(currentYearCalendar, currentMonthCalendar + 1, 1));
    };

    const handleAddPlan = (e: FormEvent) => {
        e.preventDefault();
        if (!selectedDateForPlan || !newPlanTitle.trim()) return;

        const newPlan: StudyPlan = {
            id: `${Date.now()}-${Math.random()}`,
            dateKey: selectedDateForPlan,
            title: newPlanTitle.trim(),
            time: newPlanTime.trim() || undefined,
        };

        const updated = [...studyPlans, newPlan];
        setStudyPlans(updated);
        localStorage.setItem("edutrack_study_plans", JSON.stringify(updated));
        setNewPlanTitle("");
        setNewPlanTime("");
    };

    const handleDeletePlan = (id: string) => {
        const updated = studyPlans.filter((p) => p.id !== id);
        setStudyPlans(updated);
        localStorage.setItem("edutrack_study_plans", JSON.stringify(updated));
    };

    const tomorrowReminders = useMemo(() => {
        if (!tomorrowKey) return [];
        return studyPlans.filter((p) => p.dateKey === tomorrowKey);
    }, [studyPlans, tomorrowKey]);

    const todayReminders = useMemo(() => {
        if (!todayKey) return [];
        return studyPlans.filter((p) => p.dateKey === todayKey);
    }, [studyPlans, todayKey]);

    const totalLectures = videos.length;
    const completedCount = useMemo(() => {
        return videos.filter((v) => watchedVideos.includes(v.id)).length;
    }, [videos, watchedVideos]);

    const completionPercentage = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

    const chapterStats = useMemo(() => {
        const map: Record<string, { total: number; completed: number; subject: string }> = {};
        videos.forEach((v) => {
            const ch = v.chapter || "General";
            if (!map[ch]) map[ch] = { total: 0, completed: 0, subject: v.subject };
            map[ch].total += 1;
            if (watchedVideos.includes(v.id)) map[ch].completed += 1;
        });
        return Object.entries(map);
    }, [videos, watchedVideos]);

    const activeResumeLecture = useMemo(() => {
        if (!videos || videos.length === 0) return null;
        if (lastPlayedId) {
            const found = videos.find((v) => v.id === lastPlayedId);
            if (found) return found;
        }
        const unwatched = videos.find((v) => !watchedVideos.includes(v.id));
        return unwatched || videos[0];
    }, [videos, lastPlayedId, watchedVideos]);

    const normalizedQuery = searchQuery.toLowerCase().trim();

    const filteredVideos = useMemo(() => {
        return videos.filter((v) => {
            const s = (v.subject || "").toUpperCase();
            const matchSubj = selectedSubject === "ALL" || s === selectedSubject;
            const topicStr = (v.topic || v.title || "").toLowerCase();
            const matchSearch =
                !normalizedQuery ||
                topicStr.includes(normalizedQuery) ||
                (v.chapter && v.chapter.toLowerCase().includes(normalizedQuery)) ||
                s.toLowerCase().includes(normalizedQuery);
            return matchSubj && matchSearch;
        });
    }, [videos, selectedSubject, normalizedQuery]);

    const filteredMaterials = useMemo(() => {
        return materials.filter((m) => {
            const s = (m.subject || "").toUpperCase();
            const matchSubj = selectedSubject === "ALL" || s === selectedSubject;
            const matchSearch =
                !normalizedQuery ||
                (m.title && m.title.toLowerCase().includes(normalizedQuery)) ||
                (m.chapter && m.chapter.toLowerCase().includes(normalizedQuery)) ||
                s.toLowerCase().includes(normalizedQuery);
            return matchSubj && matchSearch;
        });
    }, [materials, selectedSubject, normalizedQuery]);

    const isSearchActive = normalizedQuery.length > 0;
    const hasSearchResults = filteredVideos.length > 0 || filteredMaterials.length > 0;

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased relative">
            <div className="flex-1 flex min-w-0">
                {/* 1. LEFT SIDEBAR */}
                <aside className="w-68 bg-white border-r border-slate-200/80 p-6 flex flex-col justify-between shrink-0 hidden md:flex shadow-sm">
                    <div className="space-y-8">
                        <div className="flex items-center space-x-3 px-1">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md flex items-center justify-center shrink-0 p-1.5">
                                <img
                                    src="/logo.png"
                                    alt="AZS Logo"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                    }}
                                />
                            </div>
                            <div>
                                <span className="font-extrabold text-sm tracking-tight text-slate-900 block leading-tight">AZS</span>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 block">
                                    The Catalyst
                                </span>
                            </div>
                        </div>

                        <nav className="space-y-1.5">
                            <button
                                onClick={() => {
                                    setActiveNav("dashboard");
                                    setSearchQuery("");
                                }}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeNav === "dashboard"
                                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                <span>Dashboard</span>
                            </button>

                            <button
                                onClick={() => setActiveNav("lectures")}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeNav === "lectures"
                                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                                    }`}
                            >
                                <PlayCircle className="w-4 h-4" />
                                <span>Video Lectures</span>
                                <span className="ml-auto text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                                    {videos.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveNav("materials")}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeNav === "materials"
                                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                                    }`}
                            >
                                <FileText className="w-4 h-4" />
                                <span>Study Sheets (PDF)</span>
                                <span className="ml-auto text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                                    {materials.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveNav("ai")}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeNav === "ai"
                                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                                    }`}
                            >
                                <Bot className="w-4 h-4 text-indigo-500" />
                                <span>AI Tutor</span>
                                <span className="ml-auto text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-bold">
                                    Online
                                </span>
                            </button>
                        </nav>
                    </div>

                    {/* GOOGLE/STRIPE STANDARD PROFESSIONAL INSTRUCTOR CARD */}
                    <div className="pt-6 border-t border-slate-100 space-y-4 mb-2">
                        <div className="bg-gradient-to-br from-slate-900 via-[#181824] to-slate-950 rounded-2xl p-4 text-white shadow-xl border border-slate-800/80 relative overflow-hidden group">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500" />

                            <div className="relative z-10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                        Instructor
                                    </span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Active" />
                                </div>

                                <div>
                                    <h4 className="text-sm font-extrabold text-white tracking-tight">{TEACHER_SOCIAL.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{TEACHER_SOCIAL.role}</p>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 pt-1">
                                    <a
                                        href={TEACHER_SOCIAL.whatsapp}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center justify-center py-2 px-1 bg-white/[0.06] hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/10 rounded-xl transition-all group/btn"
                                        title="WhatsApp Direct"
                                    >
                                        <MessageCircle className="w-4 h-4 text-emerald-400 mb-1 group-hover/btn:scale-110 transition-transform" />
                                        <span className="text-[9px] font-semibold text-slate-300 group-hover/btn:text-white">WhatsApp</span>
                                    </a>

                                    <a
                                        href={TEACHER_SOCIAL.facebook}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center justify-center py-2 px-1 bg-white/[0.06] hover:bg-blue-500/20 hover:border-blue-500/40 border border-white/10 rounded-xl transition-all group/btn"
                                        title="Facebook Profile"
                                    >
                                        <Globe className="w-4 h-4 text-blue-400 mb-1 group-hover/btn:scale-110 transition-transform" />
                                        <span className="text-[9px] font-semibold text-slate-300 group-hover/btn:text-white">Facebook</span>
                                    </a>

                                    <a
                                        href={TEACHER_SOCIAL.youtube}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center justify-center py-2 px-1 bg-white/[0.06] hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/10 rounded-xl transition-all group/btn"
                                        title="YouTube Channel"
                                    >
                                        <Video className="w-4 h-4 text-rose-400 mb-1 group-hover/btn:scale-110 transition-transform" />
                                        <span className="text-[9px] font-semibold text-slate-300 group-hover/btn:text-white">YouTube</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 space-y-3">
                            <div className="flex items-center space-x-3 px-2">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-extrabold text-indigo-600 text-xs shadow-sm shrink-0">
                                    {userProfile.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                        {userProfile.full_name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium truncate">
                                        {userProfile.batch_no || userProfile.email || "Registered Student"}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50/80 transition"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* 2. MAIN WORKSPACE */}
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-30 shadow-xs">
                        <div className="flex items-center gap-3 flex-1 max-w-md">
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-sm flex md:hidden items-center justify-center shrink-0 p-1">
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    placeholder="Search topic or chapter..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-100/80 border border-transparent focus:border-slate-300 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/60 rounded-full text-amber-700 text-xs font-bold shadow-xs">
                                <Flame className="w-4 h-4 text-amber-500" />
                                <span>Streak Active</span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 relative hover:bg-slate-200/60 transition cursor-pointer">
                                <Bell className="w-4 h-4" />
                                {notice && <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 animate-ping" />}
                            </div>
                        </div>
                    </header>

                    {notice && (
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-6 py-2.5 flex items-center space-x-3 shadow-sm">
                            <span className="px-2 py-0.5 rounded bg-black text-amber-400 font-black text-[10px] tracking-wider uppercase">
                                Notice
                            </span>
                            <p className="text-xs font-bold text-white flex-1 truncate">{notice.content}</p>
                        </div>
                    )}

                    <main className="p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8 flex-1 pb-24 md:pb-10">
                        {/* SEARCH RESULTS VIEW */}
                        {isSearchActive && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                            <Search className="w-5 h-5 text-indigo-600" />
                                            <span>Search Results for &ldquo;{searchQuery}&rdquo;</span>
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Found {filteredVideos.length} lectures and {filteredMaterials.length} study sheets.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition shadow-xs"
                                    >
                                        Clear Search
                                    </button>
                                </div>

                                {!hasSearchResults ? (
                                    <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-sm space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                                            <SearchX className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-base font-extrabold text-slate-800">
                                                No Results Found
                                            </h3>
                                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                                We couldn&apos;t find any lectures or study sheets matching &ldquo;{searchQuery}&rdquo;.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                                        >
                                            Reset & View All Content
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {filteredVideos.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                                                    Video Lectures ({filteredVideos.length})
                                                </h3>
                                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {filteredVideos.map((vid) => {
                                                        const embedUrl = getYouTubeEmbedUrl(vid.youtube_url || vid.video_url || "");
                                                        const isWatched = watchedVideos.includes(vid.id);

                                                        return (
                                                            <div
                                                                key={vid.id}
                                                                id={`lecture-card-${vid.id}`}
                                                                className={`bg-white rounded-2xl overflow-hidden border transition-all duration-200 shadow-xs flex flex-col justify-between ${isWatched ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200/80"
                                                                    }`}
                                                            >
                                                                <div>
                                                                    <div className="aspect-video w-full bg-slate-900 relative">
                                                                        {embedUrl ? (
                                                                            <iframe
                                                                                src={embedUrl}
                                                                                title={vid.topic || vid.title || "Lecture"}
                                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                                allowFullScreen
                                                                                className="w-full h-full border-none"
                                                                            />
                                                                        ) : (
                                                                            <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                                                                Invalid Video Link
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="p-5 space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                                                                Lecture #{vid.lecture_no}
                                                                            </span>
                                                                            <span
                                                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${vid.subject === "PHYSICS"
                                                                                        ? "bg-indigo-50 text-indigo-700"
                                                                                        : "bg-amber-50 text-amber-800"
                                                                                    }`}
                                                                            >
                                                                                {vid.subject}
                                                                            </span>
                                                                        </div>

                                                                        <h4 className="font-extrabold text-sm text-slate-900 line-clamp-2">
                                                                            {vid.topic || vid.title}
                                                                        </h4>
                                                                        <p className="text-xs text-slate-400">{vid.chapter}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="p-5 pt-0 space-y-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            toggleWatchStatus(vid.id);
                                                                            recordLecturePlayback(vid.id);
                                                                        }}
                                                                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${isWatched
                                                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                                                                : "bg-slate-900 text-white hover:bg-slate-800"
                                                                            }`}
                                                                    >
                                                                        <span>{isWatched ? "✓ Completed" : "Mark as Watched"}</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {filteredMaterials.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                                                    Study Materials ({filteredMaterials.length})
                                                </h3>
                                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {filteredMaterials.map((mat) => {
                                                        const rawFileUrl = mat.pdf_url || mat.file_url || "";
                                                        const drivePreviewLink = getDrivePreviewUrl(rawFileUrl);

                                                        return (
                                                            <div
                                                                key={mat.id}
                                                                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4"
                                                            >
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <span
                                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${mat.subject === "PHYSICS"
                                                                                    ? "bg-indigo-50 text-indigo-700"
                                                                                    : "bg-amber-50 text-amber-800"
                                                                                }`}
                                                                        >
                                                                            {mat.subject}
                                                                        </span>
                                                                        <span className="text-[11px] text-slate-400 font-medium">{mat.chapter}</span>
                                                                    </div>

                                                                    <div className="flex items-start space-x-3">
                                                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                                                            PDF
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{mat.title}</h4>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setPreviewPdfUrl(drivePreviewLink);
                                                                            setPreviewPdfTitle(mat.title);
                                                                        }}
                                                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl text-center transition flex items-center justify-center space-x-1.5 shadow-sm shadow-indigo-600/20"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                        <span>Preview</span>
                                                                    </button>

                                                                    <a
                                                                        href={rawFileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200/80"
                                                                        title="Open in new tab / Download"
                                                                    >
                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW: DASHBOARD OVERVIEW */}
                        {!isSearchActive && activeNav === "dashboard" && (
                            <>
                                {/* HERO "MY PROGRESS" CARD */}
                                <div className="space-y-4">
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">My progress</h2>

                                    <div className="bg-[#1E1E2D] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                                        <div className="space-y-4 max-w-sm">
                                            <p className="text-xs text-slate-400 font-medium">
                                                Hi, {userProfile.full_name}!
                                            </p>
                                            <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                                                You have completed {completedCount} of {totalLectures} lessons so far!
                                            </h3>
                                            <button
                                                onClick={() => setActiveNav("lectures")}
                                                className="px-5 py-2.5 bg-white text-slate-950 rounded-xl text-xs font-extrabold flex items-center space-x-2 hover:bg-slate-100 transition shadow-lg"
                                            >
                                                <span>SEE ALL LECTURES</span>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-4 overflow-x-auto pb-2 lg:pb-0">
                                            <div className="w-48 sm:w-52 bg-[#C9B6FD] text-slate-950 rounded-2xl p-5 shrink-0 flex flex-col justify-between h-48 shadow-md">
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                                    <span>01</span>
                                                    <span>PHYSICS</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <BookOpen className="w-6 h-6 text-slate-900 mb-2" />
                                                    <h4 className="font-extrabold text-sm leading-snug truncate">
                                                        {chapterStats[0]?.[0] || "আলোর প্রতিফলন"}
                                                    </h4>
                                                    <p className="text-[11px] font-medium text-slate-700">
                                                        {chapterStats[0]?.[1]?.completed || 0}/{chapterStats[0]?.[1]?.total || 6} lessons |{" "}
                                                        {chapterStats[0]?.[1]?.total
                                                            ? Math.round(
                                                                ((chapterStats[0][1].completed || 0) / chapterStats[0][1].total) * 100
                                                            )
                                                            : 0}
                                                        %
                                                    </p>
                                                </div>
                                                <div className="w-full bg-slate-900/20 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-slate-950 h-full rounded-full"
                                                        style={{
                                                            width: `${chapterStats[0]?.[1]?.total
                                                                    ? Math.round(
                                                                        ((chapterStats[0][1].completed || 0) / chapterStats[0][1].total) * 100
                                                                    )
                                                                    : 0
                                                                }%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="w-48 sm:w-52 bg-[#FFE3B3] text-slate-950 rounded-2xl p-5 shrink-0 flex flex-col justify-between h-48 shadow-md">
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                                    <span>02</span>
                                                    <span>CHEMISTRY</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <Sparkles className="w-6 h-6 text-slate-900 mb-2" />
                                                    <h4 className="font-extrabold text-sm leading-snug truncate">
                                                        {chapterStats[1]?.[0] || "রাসায়নিক বিক্রিয়া"}
                                                    </h4>
                                                    <p className="text-[11px] font-medium text-slate-700">
                                                        {chapterStats[1]?.[1]?.completed || 0}/{chapterStats[1]?.[1]?.total || 13} lessons |{" "}
                                                        {chapterStats[1]?.[1]?.total
                                                            ? Math.round(
                                                                ((chapterStats[1][1].completed || 0) / chapterStats[1][1].total) * 100
                                                            )
                                                            : 0}
                                                        %
                                                    </p>
                                                </div>
                                                <div className="w-full bg-slate-900/20 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-slate-950 h-full rounded-full"
                                                        style={{
                                                            width: `${chapterStats[1]?.[1]?.total
                                                                    ? Math.round(
                                                                        ((chapterStats[1][1].completed || 0) / chapterStats[1][1].total) * 100
                                                                    )
                                                                    : 0
                                                                }%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="w-48 sm:w-52 bg-[#E1FC5B] text-slate-950 rounded-2xl p-5 shrink-0 flex flex-col justify-between h-48 shadow-md">
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                                    <span>03</span>
                                                    <span>OVERALL</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <CheckCircle2 className="w-6 h-6 text-slate-900 mb-2" />
                                                    <h4 className="font-extrabold text-sm leading-snug">Full Syllabus</h4>
                                                    <p className="text-[11px] font-medium text-slate-700">
                                                        {completedCount}/{totalLectures} lessons | {completionPercentage}%
                                                    </p>
                                                </div>
                                                <div className="w-full bg-slate-900/20 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-slate-950 h-full rounded-full"
                                                        style={{ width: `${completionPercentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CONTINUE WATCHING & RESUME BANNER */}
                                {activeResumeLecture && (
                                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-indigo-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 shadow-inner">
                                                <Play className="w-5 h-5 text-indigo-400 fill-indigo-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                        Continue Watching
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                                                        {activeResumeLecture.subject}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                                                    Lecture #{activeResumeLecture.lecture_no}: {activeResumeLecture.topic || activeResumeLecture.title}
                                                </h4>
                                                <p className="text-xs text-slate-400">{activeResumeLecture.chapter}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleResumeLecture(activeResumeLecture.id)}
                                            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-white" />
                                            <span>Resume Class</span>
                                        </button>
                                    </div>
                                )}

                                {/* STATISTICS & INTERACTIVE STUDY PLANNER CALENDAR */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                    <div className="lg:col-span-7 space-y-6">
                                        <h3 className="text-base font-bold text-slate-900">Statistics</h3>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                                                <p className="text-2xl sm:text-3xl font-black text-slate-900">{completedCount}</p>
                                                <p className="text-xs font-medium text-slate-400 mt-2">Lectures completed</p>
                                            </div>

                                            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                                                <p className="text-2xl sm:text-3xl font-black text-slate-900">{chapterStats.length}</p>
                                                <p className="text-xs font-medium text-slate-400 mt-2">Chapters in progress</p>
                                            </div>

                                            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                                                <p className="text-2xl sm:text-3xl font-black text-slate-900">{completionPercentage}%</p>
                                                <p className="text-xs font-medium text-slate-400 mt-2">Syllabus coverage</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-base font-bold text-slate-900">Recommended Lectures</h3>
                                                <button
                                                    onClick={() => setActiveNav("lectures")}
                                                    className="text-xs font-bold text-indigo-600 hover:underline"
                                                >
                                                    View all
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {videos.slice(0, 4).map((v) => {
                                                    const isDone = watchedVideos.includes(v.id);
                                                    return (
                                                        <div
                                                            key={v.id}
                                                            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between"
                                                        >
                                                            <div className="flex items-center space-x-3.5">
                                                                <div
                                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${v.subject === "PHYSICS"
                                                                            ? "bg-indigo-50 text-indigo-700"
                                                                            : "bg-amber-50 text-amber-800"
                                                                        }`}
                                                                >
                                                                    #{v.lecture_no}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1">
                                                                        {v.topic || v.title}
                                                                    </h4>
                                                                    <p className="text-[11px] text-slate-400">{v.chapter}</p>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => {
                                                                    toggleWatchStatus(v.id);
                                                                    recordLecturePlayback(v.id);
                                                                }}
                                                                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${isDone
                                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                                                    }`}
                                                            >
                                                                {isDone ? "✓ Done" : "Mark Watched"}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-5 space-y-6">
                                        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-sm font-extrabold text-slate-900">{currentMonthTitle}</h4>
                                                    <p className="text-[10px] text-slate-400">Click any date to schedule a study plan</p>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <button
                                                        onClick={handlePrevMonth}
                                                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition"
                                                        title="Previous Month"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={handleNextMonth}
                                                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition"
                                                        title="Next Month"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400">
                                                <span>Sun</span>
                                                <span>Mon</span>
                                                <span>Tue</span>
                                                <span>Wed</span>
                                                <span>Thu</span>
                                                <span>Fri</span>
                                                <span>Sat</span>
                                            </div>

                                            <div className="grid grid-cols-7 text-center text-xs gap-y-2 font-semibold">
                                                {Array.from({ length: startDayOfMonth }).map((_, i) => (
                                                    <span key={`empty-${i}`} className="text-slate-200">
                                                        -
                                                    </span>
                                                ))}
                                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                                    const dayNum = i + 1;
                                                    const dateKey = formatDateKey(currentYearCalendar, currentMonthCalendar, dayNum);
                                                    const isToday = dateKey === todayKey;
                                                    const hasPlans = studyPlans.some((p) => p.dateKey === dateKey);

                                                    return (
                                                        <div key={dayNum} className="flex flex-col items-center">
                                                            <button
                                                                onClick={() => setSelectedDateForPlan(dateKey)}
                                                                className={`w-7 h-7 flex items-center justify-center rounded-xl transition relative ${isToday
                                                                        ? "bg-slate-950 text-white font-bold shadow-md"
                                                                        : "text-slate-700 hover:bg-slate-100"
                                                                    }`}
                                                            >
                                                                <span>{dayNum}</span>
                                                                {hasPlans && (
                                                                    <span
                                                                        className={`w-1.5 h-1.5 rounded-full absolute -bottom-1 ${isToday ? "bg-amber-400" : "bg-indigo-600"
                                                                            }`}
                                                                    />
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {tomorrowReminders.length > 0 && (
                                            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-300/60 rounded-2xl p-5 space-y-2 shadow-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-extrabold uppercase text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                        <Bell className="w-3 h-3 text-amber-600" />
                                                        <span>Reminder: Plan Due Tomorrow!</span>
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono">{tomorrowKey}</span>
                                                </div>
                                                <div className="space-y-1.5 pt-1">
                                                    {tomorrowReminders.map((p) => (
                                                        <div key={p.id} className="text-xs font-bold text-slate-800 flex items-center justify-between">
                                                            <span>• {p.title}</span>
                                                            {p.time && <span className="text-[10px] text-slate-500 font-normal">{p.time}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {todayReminders.length > 0 && (
                                            <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-300/60 rounded-2xl p-5 space-y-2 shadow-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-extrabold uppercase text-indigo-800 bg-indigo-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-indigo-600" />
                                                        <span>Today&apos;s Scheduled Goals</span>
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono">{todayKey}</span>
                                                </div>
                                                <div className="space-y-1.5 pt-1">
                                                    {todayReminders.map((p) => (
                                                        <div key={p.id} className="text-xs font-bold text-slate-800 flex items-center justify-between">
                                                            <span>• {p.title}</span>
                                                            {p.time && <span className="text-[10px] text-slate-500 font-normal">{p.time}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-extrabold text-slate-900">Upcoming Schedule</h4>
                                                {notice && (
                                                    <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                        Live Alert
                                                    </span>
                                                )}
                                            </div>

                                            {notice ? (
                                                <div className="bg-[#1E1E2D] text-white p-4 rounded-2xl flex items-center space-x-3.5">
                                                    <div className="w-10 h-10 rounded-xl bg-[#E1FC5B] text-slate-950 flex items-center justify-center font-black text-sm shrink-0">
                                                        🗓️
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Instructor Notice</p>
                                                        <p className="text-xs font-bold leading-tight truncate">
                                                            {notice.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-6 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
                                                    <CalendarCheck className="w-6 h-6 text-slate-300 mx-auto" />
                                                    <p className="text-xs font-bold text-slate-600">No Upcoming Events</p>
                                                    <p className="text-[11px] text-slate-400">
                                                        There are currently no live sessions or notices scheduled.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* VIEW: VIDEO LECTURES GRID */}
                        {!isSearchActive && activeNav === "lectures" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-extrabold text-slate-900">Video Lectures</h2>
                                        <p className="text-xs text-slate-400">Stream recorded classes, take personal notes, and mark completed lectures.</p>
                                    </div>

                                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs">
                                        {(["ALL", "PHYSICS", "CHEMISTRY"] as const).map((subj) => (
                                            <button
                                                key={subj}
                                                onClick={() => setSelectedSubject(subj)}
                                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${selectedSubject === subj
                                                        ? "bg-slate-900 text-white shadow-xs"
                                                        : "text-slate-600 hover:text-slate-900"
                                                    }`}
                                            >
                                                {subj === "ALL" ? "All Subjects" : subj === "PHYSICS" ? "Physics" : "Chemistry"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {filteredVideos.length === 0 ? (
                                    <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-xs border border-slate-200/80">
                                        No video lectures match your filter.
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredVideos.map((vid) => {
                                            const embedUrl = getYouTubeEmbedUrl(vid.youtube_url || vid.video_url || "");
                                            const isWatched = watchedVideos.includes(vid.id);
                                            const isNotesOpen = openNotesId === vid.id;
                                            const hasNotes = Boolean(lectureNotes[vid.id]?.trim());

                                            return (
                                                <div
                                                    key={vid.id}
                                                    id={`lecture-card-${vid.id}`}
                                                    className={`bg-white rounded-2xl overflow-hidden border transition-all duration-200 shadow-xs flex flex-col justify-between ${isWatched ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200/80"
                                                        }`}
                                                >
                                                    <div>
                                                        <div className="aspect-video w-full bg-slate-900 relative">
                                                            {embedUrl ? (
                                                                <iframe
                                                                    src={embedUrl}
                                                                    title={vid.topic || vid.title || "Lecture"}
                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                    allowFullScreen
                                                                    className="w-full h-full border-none"
                                                                />
                                                            ) : (
                                                                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                                                    Invalid Video Link
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="p-5 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                                                    Lecture #{vid.lecture_no}
                                                                </span>
                                                                <span
                                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${vid.subject === "PHYSICS"
                                                                            ? "bg-indigo-50 text-indigo-700"
                                                                            : "bg-amber-50 text-amber-800"
                                                                        }`}
                                                                >
                                                                    {vid.subject}
                                                                </span>
                                                            </div>

                                                            <h3 className="font-extrabold text-sm text-slate-900 line-clamp-2">
                                                                {vid.topic || vid.title}
                                                            </h3>
                                                            <p className="text-xs text-slate-400">{vid.chapter}</p>
                                                        </div>
                                                    </div>

                                                    <div className="p-5 pt-0 space-y-3">
                                                        <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-slate-50/50">
                                                            <button
                                                                onClick={() => setOpenNotesId(isNotesOpen ? null : vid.id)}
                                                                className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100/80 transition"
                                                            >
                                                                <div className="flex items-center gap-1.5">
                                                                    <FileEdit className="w-3.5 h-3.5 text-indigo-600" />
                                                                    <span>My Lecture Notes</span>
                                                                    {hasNotes && (
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                                                    {saveStatus[vid.id] && (
                                                                        <span className="text-emerald-600 font-semibold text-[10px]">Saved!</span>
                                                                    )}
                                                                    {isNotesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                </div>
                                                            </button>

                                                            {isNotesOpen && (
                                                                <div className="p-3 bg-white border-t border-slate-200/60 space-y-2.5 animate-in fade-in duration-100">
                                                                    <textarea
                                                                        rows={4}
                                                                        placeholder="Jot down key formulas, tips, or timestamps here..."
                                                                        value={lectureNotes[vid.id] || ""}
                                                                        onChange={(e) => handleNoteChange(vid.id, e.target.value)}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none font-sans"
                                                                    />

                                                                    <div className="flex items-center justify-between">
                                                                        <button
                                                                            onClick={() => handleAddTimestampTag(vid.id)}
                                                                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                                                        >
                                                                            <Clock className="w-3 h-3" />
                                                                            <span>+ Add Timestamp</span>
                                                                        </button>

                                                                        {hasNotes && (
                                                                            <button
                                                                                onClick={() => handleExportNotes(vid)}
                                                                                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                                                                                title="Download as TXT file"
                                                                            >
                                                                                <Download className="w-3.5 h-3.5" />
                                                                                <span>Export</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                toggleWatchStatus(vid.id);
                                                                recordLecturePlayback(vid.id);
                                                            }}
                                                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${isWatched
                                                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                                                    : "bg-slate-900 text-white hover:bg-slate-800"
                                                                }`}
                                                        >
                                                            <span>{isWatched ? "✓ Completed" : "Mark as Watched"}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW: STUDY MATERIALS (PDF) */}
                        {!isSearchActive && activeNav === "materials" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-extrabold text-slate-900">Study Materials & Handouts</h2>
                                        <p className="text-xs text-slate-400">Download lecture notes and practice problem sets.</p>
                                    </div>

                                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs">
                                        {(["ALL", "PHYSICS", "CHEMISTRY"] as const).map((subj) => (
                                            <button
                                                key={subj}
                                                onClick={() => setSelectedSubject(subj)}
                                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${selectedSubject === subj
                                                        ? "bg-slate-900 text-white shadow-xs"
                                                        : "text-slate-600 hover:text-slate-900"
                                                    }`}
                                            >
                                                {subj === "ALL" ? "All" : subj === "PHYSICS" ? "Physics" : "Chemistry"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {filteredMaterials.length === 0 ? (
                                    <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-xs border border-slate-200/80">
                                        No study sheets found.
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredMaterials.map((mat) => {
                                            const rawFileUrl = mat.pdf_url || mat.file_url || "";
                                            const drivePreviewLink = getDrivePreviewUrl(rawFileUrl);

                                            return (
                                                <div
                                                    key={mat.id}
                                                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4"
                                                >
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span
                                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${mat.subject === "PHYSICS"
                                                                        ? "bg-indigo-50 text-indigo-700"
                                                                        : "bg-amber-50 text-amber-800"
                                                                    }`}
                                                            >
                                                                {mat.subject}
                                                            </span>
                                                            <span className="text-[11px] text-slate-400 font-medium">{mat.chapter}</span>
                                                        </div>

                                                        <div className="flex items-start space-x-3">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                                                PDF
                                                            </div>
                                                            <div>
                                                                <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{mat.title}</h3>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setPreviewPdfUrl(drivePreviewLink);
                                                                setPreviewPdfTitle(mat.title);
                                                            }}
                                                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl text-center transition flex items-center justify-center space-x-1.5 shadow-sm shadow-indigo-600/20"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>Preview</span>
                                                        </button>

                                                        <a
                                                            href={rawFileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200/80"
                                                            title="Open in new tab / Download"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW: INTEGRATED AI TUTOR (FULL PAGE) */}
                        {!isSearchActive && activeNav === "ai" && (
                            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[640px]">
                                <div className="p-5 bg-slate-50 border-b border-slate-200/80 flex items-center space-x-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow">
                                        ✨
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-extrabold text-slate-900">AZS: The Catalyst - AI Tutor</h3>
                                        <p className="text-[11px] text-emerald-600 font-medium">Ready to explain Theory, Formulas, and Math</p>
                                    </div>
                                </div>

                                <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
                                    {chatMessages.map((m, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[80%] px-4 py-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${m.role === "user"
                                                        ? "bg-slate-900 text-white rounded-br-none font-medium"
                                                        : "bg-slate-100 text-slate-800 rounded-bl-none font-medium border border-slate-200/60"
                                                    }`}
                                            >
                                                {m.content}
                                            </div>
                                        </div>
                                    ))}
                                    {chatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-100 text-slate-500 px-4 py-2.5 rounded-2xl text-xs animate-pulse">
                                                AI is thinking...
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                <form onSubmit={handleSendChat} className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ask any question (e.g., Explain Ohm's law or Archimedes principle)..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={chatLoading || !chatInput.trim()}
                                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-xs transition shadow-md"
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        )}
                    </main>

                    {/* DEVELOPER CREDIT FOOTER */}
                    <footer className="w-full py-4 px-6 text-center border-t border-slate-200/80 bg-white/80 backdrop-blur-sm mt-auto">
                        <p className="text-xs text-slate-500 font-medium tracking-wide">
                            © {currentYear} AZS: The Catalyst • Developed with ❤️ by{" "}
                            <a
                                href="https://www.linkedin.com/in/sajedul-islam-data/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors inline-flex items-center gap-1"
                            >
                                Mir Mohammad Sajedul Islam
                                <ExternalLink className="w-3 h-3 inline" />
                            </a>
                        </p>
                    </footer>
                </div>
            </div>

            {/* MOBILE BOTTOM NAVIGATION BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex md:hidden items-center justify-around z-40 shadow-lg">
                <button
                    onClick={() => { setActiveNav("dashboard"); setSearchQuery(""); }}
                    className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold ${activeNav === "dashboard" ? "text-indigo-600" : "text-slate-500"}`}
                >
                    <LayoutDashboard className="w-5 h-5 mb-0.5" />
                    <span>Home</span>
                </button>
                <button
                    onClick={() => setActiveNav("lectures")}
                    className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold ${activeNav === "lectures" ? "text-indigo-600" : "text-slate-500"}`}
                >
                    <PlayCircle className="w-5 h-5 mb-0.5" />
                    <span>Lectures</span>
                </button>
                <button
                    onClick={() => setActiveNav("materials")}
                    className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold ${activeNav === "materials" ? "text-indigo-600" : "text-slate-500"}`}
                >
                    <FileText className="w-5 h-5 mb-0.5" />
                    <span>Sheets</span>
                </button>
                <button
                    onClick={() => setActiveNav("ai")}
                    className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold ${activeNav === "ai" ? "text-indigo-600" : "text-slate-500"}`}
                >
                    <Bot className="w-5 h-5 mb-0.5 text-indigo-600" />
                    <span>AI Tutor</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold text-rose-500"
                >
                    <LogOut className="w-5 h-5 mb-0.5" />
                    <span>Logout</span>
                </button>
            </div>

            {/* FLOATING AI CHAT BUTTON & POPUP WIDGET (RIGHT CORNER) */}
            <div className="fixed bottom-20 md:bottom-6 right-5 z-50">
                {!isFloatingChatOpen ? (
                    <button
                        onClick={() => setIsFloatingChatOpen(true)}
                        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 group relative border-2 border-white/20"
                        title="Ask AI Tutor"
                    >
                        <Bot className="w-7 h-7 text-white animate-bounce" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                    </button>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-3xl w-[90vw] sm:w-[380px] h-[500px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
                        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm shadow">
                                    ✨
                                </div>
                                <div>
                                    <h4 className="text-xs font-extrabold">AZS AI Assistant</h4>
                                    <p className="text-[10px] text-emerald-400 font-mono">Online • Physics & Chemistry</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsFloatingChatOpen(false)}
                                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-[#F4F6FA]/50">
                            {chatMessages.map((m, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${m.role === "user"
                                                ? "bg-slate-900 text-white rounded-br-none font-medium"
                                                : "bg-white text-slate-800 rounded-bl-none font-medium border border-slate-200/80 shadow-sm"
                                            }`}
                                    >
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white text-slate-500 px-3 py-2 rounded-2xl text-[11px] border border-slate-200 animate-pulse shadow-sm">
                                        AI is thinking...
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Ask your doubt..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                className="flex-1 bg-[#F4F6FA] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                                type="submit"
                                disabled={chatLoading || !chatInput.trim()}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow-md shadow-indigo-600/20"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* 3. STUDY PLANNER MODAL */}
            {selectedDateForPlan && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-indigo-600" />
                                    <span>Study Planner</span>
                                </h3>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">Date: {selectedDateForPlan}</p>
                            </div>
                            <button
                                onClick={() => setSelectedDateForPlan(null)}
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {studyPlans.filter((p) => p.dateKey === selectedDateForPlan).length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-2xl">
                                    No study plans set for this day yet.
                                </p>
                            ) : (
                                studyPlans
                                    .filter((p) => p.dateKey === selectedDateForPlan)
                                    .map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 p-3 rounded-2xl border border-slate-100 text-xs transition"
                                        >
                                            <div className="space-y-0.5">
                                                <p className="font-bold text-slate-800">{p.title}</p>
                                                {p.time && <p className="text-[10px] text-slate-400 font-mono">{p.time}</p>}
                                            </div>
                                            <button
                                                onClick={() => handleDeletePlan(p.id)}
                                                className="text-slate-400 hover:text-rose-500 p-1"
                                                title="Remove plan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                            )}
                        </div>

                        <form onSubmit={handleAddPlan} className="space-y-3 pt-2 border-t border-slate-100">
                            <label className="text-xs font-bold text-slate-700 block">Add Goal / Revision Plan</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Complete Reflection of Light CQ-01"
                                value={newPlanTitle}
                                onChange={(e) => setNewPlanTitle(e.target.value)}
                                className="w-full bg-[#F4F6FA] border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Target Time (e.g. 8:00 PM)"
                                    value={newPlanTime}
                                    onChange={(e) => setNewPlanTime(e.target.value)}
                                    className="flex-1 bg-[#F4F6FA] border border-slate-200 rounded-2xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Save Plan</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. PDF IN-APP PREVIEW MODAL */}
            {previewPdfUrl && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                                    PDF
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-white leading-tight">
                                        {previewPdfTitle || "Document Preview"}
                                    </h3>
                                    <p className="text-[10px] text-slate-400">AZS: The Catalyst - Document Reader</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <a
                                    href={previewPdfUrl.replace("/preview", "/view")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Open in Drive</span>
                                </a>
                                <button
                                    onClick={() => setPreviewPdfUrl(null)}
                                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 w-full bg-slate-950 relative">
                            <iframe
                                src={previewPdfUrl}
                                title={previewPdfTitle}
                                className="w-full h-full border-none"
                                allow="autoplay"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function StudentDashboardPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-0 min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-3">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-slate-600 tracking-wide">Loading AZS Workspace...</p>
                </div>
            }
        >
            <DashboardContent />
        </Suspense>
    );
}