"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  FormEvent,
  Suspense,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  ArrowRight,
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
  Atom,
  FlaskConical,
  FolderOpen,
  ArrowLeft,
  Menu,
  ShieldAlert,
  Lock,
  CreditCard,
} from "lucide-react";
import axios from "axios";
import EduTrackAiChat from "@/components/EduTrackAiChat";

// --- Professional Teacher Social Config ---
const TEACHER_SOCIAL = {
  name: "AZS RAZON SIR",
  whatsapp: "https://wa.me/8801916201426",
  facebook: "https://www.facebook.com/razon.sikdar.1",
  youtube: "https://www.youtube.com/@AZSChemistry",
};

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://edutrack-backend-qjxg.onrender.com"
).replace(/\/$/, "");

const api = axios.create({
  baseURL: BACKEND_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("token") || localStorage.getItem("access_token");
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
  days_left?: number;
  is_approved?: boolean;
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
  const [activeNav, setActiveNav] = useState<
    "dashboard" | "lectures" | "materials" | "ai"
  >("dashboard");
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState(2025);

  // Mobile Sidebar Drawer State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Subject & Chapter View State
  const [selectedSubjectTab, setSelectedSubjectTab] = useState<
    "PHYSICS" | "CHEMISTRY"
  >("PHYSICS");
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  // Subject transition animation states
  const [activeTransition, setActiveTransition] = useState<
    "PHYSICS" | "CHEMISTRY" | null
  >(null);

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
    days_left: 30,
    is_approved: true,
  });

  const [videos, setVideos] = useState<VideoLecture[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  const [openNotesId, setOpenNotesId] = useState<string | null>(null);
  const [lectureNotes, setLectureNotes] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, boolean>>({});

  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string>("");

  const [calendarViewDate, setCalendarViewDate] = useState<Date | null>(null);
  const [todayKey, setTodayKey] = useState<string>("");
  const [tomorrowKey, setTomorrowKey] = useState<string>("");
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [selectedDateForPlan, setSelectedDateForPlan] = useState<string | null>(
    null
  );
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanTime, setNewPlanTime] = useState("");

  const formatDateKey = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  // --- MOBILE BACK BUTTON GUARD & HISTORY MANAGEMENT ---
  useEffect(() => {
    setMounted(true);
    setCurrentYear(new Date().getFullYear());

    if (typeof window !== "undefined") {
      window.history.pushState(null, "", window.location.href);
      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        window.history.pushState(null, "", window.location.href);
        if (selectedChapter) {
          setSelectedChapter(null);
        } else if (activeNav !== "dashboard") {
          setActiveNav("dashboard");
          setSearchQuery("");
        }
      };
      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [activeNav, selectedChapter]);

  useEffect(() => {
    const now = new Date();
    setCalendarViewDate(new Date(now.getFullYear(), now.getMonth(), 1));

    const todayStr = formatDateKey(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    setTodayKey(todayStr);

    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwStr = formatDateKey(
      tmrw.getFullYear(),
      tmrw.getMonth(),
      tmrw.getDate()
    );
    setTomorrowKey(tmrwStr);

    const token =
      localStorage.getItem("token") || localStorage.getItem("access_token");
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

    const storedName =
      localStorage.getItem("user_name") ||
      localStorage.getItem("student_name") ||
      "Student";
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
      days_left: 30,
      is_approved: true,
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
          days_left:
            res.data.days_left !== undefined
              ? res.data.days_left
              : prev.days_left,
          is_approved:
            res.data.is_approved !== undefined
              ? res.data.is_approved
              : prev.is_approved,
        }));
        if (res.data.full_name)
          localStorage.setItem("user_name", res.data.full_name);
        if (res.data.batch_no)
          localStorage.setItem("batch_no", res.data.batch_no);
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

  const handleSubjectTransition = (subject: "PHYSICS" | "CHEMISTRY") => {
    setActiveTransition(subject);
    setSelectedSubjectTab(subject);
    setSelectedChapter(null);
    setActiveNav("lectures");
    setTimeout(() => {
      setActiveTransition(null);
    }, 600);
  };

  // --- CHAPTER-WISE GROUPING LOGIC FOR BACKEND DATA ---
  const chaptersBySubject = useMemo(() => {
    const physicsMap: Record<string, VideoLecture[]> = {};
    const chemistryMap: Record<string, VideoLecture[]> = {};

    videos.forEach((vid) => {
      const subj = (vid.subject || "PHYSICS").toUpperCase();
      const chName = vid.chapter ? vid.chapter.trim() : "General Chapter";
      if (subj === "CHEMISTRY") {
        if (!chemistryMap[chName]) chemistryMap[chName] = [];
        chemistryMap[chName].push(vid);
      } else {
        if (!physicsMap[chName]) physicsMap[chName] = [];
        physicsMap[chName].push(vid);
      }
    });

    return {
      PHYSICS: physicsMap,
      CHEMISTRY: chemistryMap,
    };
  }, [videos]);

  const currentSubjectChapters = useMemo(() => {
    return chaptersBySubject[selectedSubjectTab] || {};
  }, [chaptersBySubject, selectedSubjectTab]);

  const materialsByChapter = useMemo(() => {
    const map: Record<string, Material[]> = {};
    materials.forEach((mat) => {
      const chName = mat.chapter ? mat.chapter.trim() : "General Chapter";
      if (!map[chName]) map[chName] = [];
      map[chName].push(mat);
    });
    return map;
  }, [materials]);

  const toggleWatchStatus = (id: string) => {
    const updated = watchedVideos.includes(id)
      ? watchedVideos.filter((vId) => vId !== id)
      : [...watchedVideos, id];
    setWatchedVideos(updated);
    localStorage.setItem("edutrack_watched_videos", JSON.stringify(updated));
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
    const noteText =
      lectureNotes[lecture.id] || "No notes recorded for this lecture.";
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

  const handleLogout = () => {
    localStorage.clear();
    router.replace("/login");
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentYearCalendar = calendarViewDate
    ? calendarViewDate.getFullYear()
    : 2025;
  const currentMonthCalendar = calendarViewDate
    ? calendarViewDate.getMonth()
    : 9;
  const currentMonthTitle = `${monthNames[currentMonthCalendar]} ${currentYearCalendar}`;

  const daysInMonth = new Date(
    currentYearCalendar,
    currentMonthCalendar + 1,
    0
  ).getDate();
  const startDayOfMonth = new Date(
    currentYearCalendar,
    currentMonthCalendar,
    1
  ).getDay();

  const handlePrevMonth = () => {
    setCalendarViewDate(
      new Date(currentYearCalendar, currentMonthCalendar - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCalendarViewDate(
      new Date(currentYearCalendar, currentMonthCalendar + 1, 1)
    );
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

  const totalLectures = videos.length;
  const completedCount = useMemo(() => {
    return videos.filter((v) => watchedVideos.includes(v.id)).length;
  }, [videos, watchedVideos]);

  const completionPercentage =
    totalLectures > 0
      ? Math.round((completedCount / totalLectures) * 100)
      : 0;

  const chapterStats = useMemo(() => {
    const map: Record<
      string,
      { total: number; completed: number; subject: string }
    > = {};
    videos.forEach((v) => {
      const ch = v.chapter || "General";
      if (!map[ch])
        map[ch] = { total: 0, completed: 0, subject: v.subject };
      map[ch].total += 1;
      if (watchedVideos.includes(v.id)) map[ch].completed += 1;
    });
    return Object.entries(map);
  }, [videos, watchedVideos]);

  const normalizedQuery = searchQuery.toLowerCase().trim();

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      const topicStr = (v.topic || v.title || "").toLowerCase();
      const matchSearch =
        !normalizedQuery ||
        topicStr.includes(normalizedQuery) ||
        (v.chapter && v.chapter.toLowerCase().includes(normalizedQuery)) ||
        (v.subject && v.subject.toLowerCase().includes(normalizedQuery));
      return matchSearch;
    });
  }, [videos, normalizedQuery]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch =
        !normalizedQuery ||
        (m.title && m.title.toLowerCase().includes(normalizedQuery)) ||
        (m.chapter && m.chapter.toLowerCase().includes(normalizedQuery)) ||
        (m.subject && m.subject.toLowerCase().includes(normalizedQuery));
      return matchSearch;
    });
  }, [materials, normalizedQuery]);

  const isSearchActive = normalizedQuery.length > 0;
  const hasSearchResults =
    filteredVideos.length > 0 || filteredMaterials.length > 0;

  // --- SUBSCRIPTION STATUS CHECKS ---
  const daysLeft =
    userProfile.days_left !== undefined ? userProfile.days_left : 30;
  const isExpired = daysLeft <= 0 || userProfile.is_approved === false;
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 3;

  if (!mounted) return null;

  return (
    <div className="min-h-screen azs-grid-bg text-slate-100 flex flex-col font-sans antialiased relative overflow-x-hidden selection:bg-indigo-500/30">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="azs-orb azs-orb-indigo top-[-120px] left-[10%] h-[420px] w-[420px] opacity-25" />
        <div className="azs-orb azs-orb-cyan bottom-[10%] right-[-80px] h-[360px] w-[360px] opacity-20" />
        <div className="azs-orb azs-orb-violet top-[40%] left-[-100px] h-[300px] w-[300px] opacity-15" />
      </div>

      {/* SUBJECT TRANSITION OVERLAY */}
      <AnimatePresence>
        {activeTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] bg-[#060a12]/92 backdrop-blur-xl flex flex-col items-center justify-center"
          >
            {activeTransition === "PHYSICS" ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="flex flex-col items-center space-y-6"
              >
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-indigo-400/30 animate-ping" />
                  <div className="absolute inset-3 rounded-full border border-cyan-400/20" />
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-400/60 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.45)]">
                    <Atom
                      className="w-8 h-8 text-indigo-300"
                      style={{ animation: "spin 6s linear infinite" }}
                    />
                  </div>
                </div>
                <div className="text-center space-y-1.5">
                  <span className="text-[10px] font-mono tracking-[0.25em] text-indigo-400 uppercase">
                    Quantum Core Protocol
                  </span>
                  <h3 className="text-lg font-extrabold text-white tracking-wide">
                    Initializing Physics Matrix...
                  </h3>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="flex flex-col items-center space-y-6"
              >
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-ping" />
                  <div className="absolute inset-3 rounded-full border border-orange-400/20" />
                  <div className="w-16 h-16 rounded-2xl bg-amber-600/20 border border-amber-400/60 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.45)]">
                    <FlaskConical className="w-8 h-8 text-amber-300 animate-bounce" />
                  </div>
                </div>
                <div className="text-center space-y-1.5">
                  <span className="text-[10px] font-mono tracking-[0.25em] text-amber-400 uppercase">
                    Synthesis Lab Protocol
                  </span>
                  <h3 className="text-lg font-extrabold text-white tracking-wide">
                    Loading Chemistry Vault...
                  </h3>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* === PART 2 CONTINUES HERE (sidebar, header, main panels) === */}

                  <div className="flex-1 flex min-w-0 relative z-10">
        {/* 1. MOBILE SIDEBAR OVERLAY BACKDROP */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* 1. LEFT SIDEBAR */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-72 azs-glass border-r border-slate-800/80 p-5 flex flex-col justify-between shrink-0 shadow-2xl transition-transform duration-300 ease-in-out ${
            isMobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="space-y-7">
            {/* Brand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 px-1">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-cyan-500/30 shadow-[0_0_18px_rgba(34,211,238,0.15)] flex items-center justify-center shrink-0 p-1.5">
                  <img
                    src="/logo.png"
                    alt="AZS Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <span className="font-extrabold text-sm tracking-tight text-white block leading-tight">
                    AZS
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 block">
                    The Catalyst
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-900/80 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav */}
            <nav className="space-y-1.5">
              {(
                [
                  {
                    id: "dashboard" as const,
                    label: "Command Deck",
                    icon: LayoutDashboard,
                    extra: null,
                  },
                  {
                    id: "lectures" as const,
                    label: "Video Lectures",
                    icon: PlayCircle,
                    extra: (
                      <span className="ml-auto text-[10px] bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded-md font-mono border border-slate-700/50">
                        {videos.length}
                      </span>
                    ),
                  },
                  {
                    id: "materials" as const,
                    label: "Study Sheets (PDF)",
                    icon: FileText,
                    extra: (
                      <span className="ml-auto text-[10px] bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded-md font-mono border border-slate-700/50">
                        {materials.length}
                      </span>
                    ),
                  },
                  {
                    id: "ai" as const,
                    label: "AI Tutor Core",
                    icon: Bot,
                    extra: (
                      <span className="ml-auto text-[10px] azs-badge-cyan px-2 py-0.5 rounded-md font-bold">
                        Online
                      </span>
                    ),
                  },
                ] as const
              ).map(({ id, label, icon: Icon, extra }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveNav(id);
                    setSelectedChapter(null);
                    if (id === "dashboard") setSearchQuery("");
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeNav === id
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/80 border border-transparent"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      activeNav === id
                        ? "text-white"
                        : id === "ai"
                          ? "text-cyan-400"
                          : ""
                    }`}
                  />
                  <span>{label}</span>
                  {extra}
                </button>
              ))}
            </nav>
          </div>

          {/* Instructor uplink + profile */}
          <div className="pt-5 border-t border-slate-800/80 space-y-4 mb-1">
            <div className="azs-card-glow rounded-2xl p-4 text-white relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500" />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="azs-badge azs-badge-indigo text-[9px]">
                    Academic Guide
                  </span>
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    title="Active"
                  />
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-white tracking-tight">
                    {TEACHER_SOCIAL.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Physics &amp; Chemistry Lead
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <a
                    href={TEACHER_SOCIAL.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center py-2 px-1 bg-white/[0.04] hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/10 rounded-xl transition-all group/btn"
                    title="WhatsApp Direct"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400 mb-1 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-semibold text-slate-300 group-hover/btn:text-white">
                      WhatsApp
                    </span>
                  </a>

                  <a
                    href={TEACHER_SOCIAL.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center py-2 px-1 bg-white/[0.04] hover:bg-blue-500/20 hover:border-blue-500/40 border border-white/10 rounded-xl transition-all group/btn"
                    title="Facebook Profile"
                  >
                    <Globe className="w-4 h-4 text-blue-400 mb-1 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-semibold text-slate-300 group-hover/btn:text-white">
                      Facebook
                    </span>
                  </a>

                  <a
                    href={TEACHER_SOCIAL.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center py-2 px-1 bg-white/[0.04] hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/10 rounded-xl transition-all group/btn"
                    title="YouTube Channel"
                  >
                    <Video className="w-4 h-4 text-rose-400 mb-1 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-semibold text-slate-300 group-hover/btn:text-white">
                      YouTube
                    </span>
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center space-x-3 px-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 border border-indigo-500/30 flex items-center justify-center font-extrabold text-cyan-300 text-xs shadow-sm shrink-0">
                  {userProfile.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">
                    {userProfile.full_name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    {userProfile.batch_no ||
                      userProfile.email ||
                      "Registered Student"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* 2. MAIN WORKSPACE */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
          {/* Top Header */}
          <header className="h-16 sm:h-18 bg-[#060a12]/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/30 flex md:hidden items-center justify-center shrink-0 transition"
                title="Open Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 border border-indigo-500/30 shadow-sm hidden sm:flex md:hidden items-center justify-center shrink-0 p-1">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search topic or chapter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="azs-input pl-10 pr-9 py-2.5 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 azs-badge-emerald rounded-full text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline text-emerald-300">
                  Streak Active
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 text-slate-300 border border-slate-800 relative hover:border-cyan-500/30 hover:text-white transition cursor-pointer">
                <Bell className="w-4 h-4" />
                {notice && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 animate-ping" />
                )}
              </div>
            </div>
          </header>

          {/* SUBSCRIPTION EXPIRED / EXPIRING BANNER */}
          {(isExpired || isExpiringSoon) && (
            <div
              className={`px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-xl gap-3 ${
                isExpired
                  ? "bg-gradient-to-r from-rose-950 via-rose-900/90 to-slate-950 border-b border-rose-500/40 text-rose-200"
                  : "bg-gradient-to-r from-amber-950 via-orange-950/90 to-slate-950 border-b border-amber-500/40 text-amber-200"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isExpired
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    {isExpired
                      ? "Subscription Expired — Streaming & Materials Locked"
                      : `Payment Reminder: ${daysLeft} ${
                          daysLeft === 1 ? "Day" : "Days"
                        } Remaining`}
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {isExpired
                      ? "Your coaching pass has expired. Video streaming and PDF handouts are locked until payment is cleared."
                      : "Your coaching pass is due for renewal soon. Complete payment to avoid interruption."}
                  </p>
                </div>
              </div>

              <a
                href={TEACHER_SOCIAL.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shrink-0 ${
                  isExpired
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                    : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay / Renew via WhatsApp</span>
              </a>
            </div>
          )}

          {/* Notice strip */}
          {notice && (
            <div className="bg-gradient-to-r from-amber-600/90 to-orange-600/90 text-white px-5 sm:px-6 py-2.5 flex items-center space-x-3 shadow-md border-b border-amber-400/20">
              <span className="px-2 py-0.5 rounded-md bg-black/30 text-amber-200 font-black text-[10px] tracking-wider uppercase shrink-0">
                Notice
              </span>
              <p className="text-xs font-bold text-white flex-1 truncate">
                {notice.content}
              </p>
            </div>
          )}

          <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 flex-1 pb-28 md:pb-12 relative z-10">
            {/* EXPIRED LOCK CARD */}
            {isExpired && (
              <div className="azs-card-glow rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-[0_0_30px_rgba(244,63,94,0.15)]">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2 max-w-lg mx-auto">
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    System Access Notice: Payment Required
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Your 30-day subscription period has ended. As a result,{" "}
                    <span className="text-rose-400 font-bold">
                      video lecture streaming and study material downloads are
                      currently locked
                    </span>
                    .
                  </p>
                  <p className="text-xs text-slate-400">
                    Please contact{" "}
                    <span className="font-bold text-white">AZS Razon Sir</span>{" "}
                    to clear your coaching fees and renew your account.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={TEACHER_SOCIAL.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Contact Sir on WhatsApp</span>
                  </a>
                </div>
              </div>
            )}

            {/* SEARCH RESULTS VIEW */}
            {!isExpired && isSearchActive && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                      <Search className="w-5 h-5 text-cyan-400" />
                      <span>
                        Search Results for &ldquo;{searchQuery}&rdquo;
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Found {filteredVideos.length} lectures and{" "}
                      {filteredMaterials.length} study sheets.
                    </p>
                  </div>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl transition hover:border-cyan-500/30"
                  >
                    Clear Search
                  </button>
                </div>

                {!hasSearchResults ? (
                  <div className="azs-card rounded-3xl p-12 sm:p-16 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-900 text-slate-500 mx-auto flex items-center justify-center border border-slate-800">
                      <SearchX className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-white">
                        No Results Found
                      </h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        We couldn&apos;t find any lectures or study sheets
                        matching &ldquo;{searchQuery}&rdquo;.
                      </p>
                    </div>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="azs-btn-primary w-auto px-5 py-2.5 text-xs inline-flex"
                    >
                      Reset &amp; View All Content
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {filteredVideos.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                          <PlayCircle className="w-4 h-4 text-cyan-400" />
                          Video Lectures ({filteredVideos.length})
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {filteredVideos.map((vid) => {
                            const embedUrl = getYouTubeEmbedUrl(
                              vid.youtube_url || vid.video_url || ""
                            );
                            const isWatched = watchedVideos.includes(vid.id);

                            return (
                              <div
                                key={vid.id}
                                id={`lecture-card-${vid.id}`}
                                className={`azs-card azs-glass-hover rounded-2xl overflow-hidden flex flex-col justify-between ${
                                  isWatched
                                    ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
                                    : ""
                                }`}
                              >
                                <div>
                                  <div className="aspect-video w-full bg-slate-950 relative">
                                    {embedUrl ? (
                                      <iframe
                                        src={embedUrl}
                                        title={
                                          vid.topic || vid.title || "Lecture"
                                        }
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full border-none"
                                      />
                                    ) : (
                                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                                        Invalid Video Link
                                      </div>
                                    )}
                                  </div>

                                  <div className="p-5 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
                                        Lecture #{vid.lecture_no}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                          vid.subject === "PHYSICS"
                                            ? "azs-badge-indigo"
                                            : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                        }`}
                                      >
                                        {vid.subject}
                                      </span>
                                    </div>

                                    <h4 className="font-extrabold text-sm text-white line-clamp-2">
                                      {vid.topic || vid.title}
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                      {vid.chapter}
                                    </p>
                                  </div>
                                </div>

                                <div className="p-5 pt-0">
                                  <button
                                    onClick={() => toggleWatchStatus(vid.id)}
                                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                                      isWatched
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                        : "azs-btn-primary"
                                    }`}
                                  >
                                    <span>
                                      {isWatched
                                        ? "✓ Completed"
                                        : "Mark as Watched"}
                                    </span>
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
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                          <FileText className="w-4 h-4 text-violet-400" />
                          Study Materials ({filteredMaterials.length})
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {filteredMaterials.map((mat) => {
                            const rawFileUrl =
                              mat.pdf_url || mat.file_url || "";
                            const drivePreviewLink =
                              getDrivePreviewUrl(rawFileUrl);

                            return (
                              <div
                                key={mat.id}
                                className="azs-card azs-glass-hover rounded-2xl p-5 flex flex-col justify-between space-y-4"
                              >
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                        mat.subject === "PHYSICS"
                                          ? "azs-badge-indigo"
                                          : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                      }`}
                                    >
                                      {mat.subject}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-medium truncate">
                                      {mat.chapter}
                                    </span>
                                  </div>

                                  <div className="flex items-start space-x-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-[10px] shrink-0">
                                      PDF
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold text-sm text-white leading-snug">
                                        {mat.title}
                                      </h4>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setPreviewPdfUrl(drivePreviewLink);
                                      setPreviewPdfTitle(mat.title);
                                    }}
                                    className="flex-1 py-2.5 azs-btn-primary text-xs"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Preview</span>
                                  </button>

                                  <a
                                    href={rawFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-xl transition border border-slate-800 hover:border-cyan-500/30"
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

            {/* === PART 3 CONTINUES HERE (dashboard home, lectures, materials, AI, calendar) === */}
                                                {/* VIEW: DASHBOARD OVERVIEW (EXPLORATION DECK) */}
                        {!isExpired && !isSearchActive && activeNav === "dashboard" && (
                            <motion.div 
                                initial={{ opacity: 0, y: 15 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                                            <span className="azs-gradient-text">Command Center</span>
                                            <span className="azs-badge-cyan animate-pulse">
                                                Online
                                            </span>
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-1">Welcome back, <strong className="text-white">{userProfile.full_name}</strong>. Select an exploration deck below.</p>
                                    </div>
                                </div>

                                {/* IMMERSIVE SUBJECT EXPLORATION LAUNCHPAD */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <motion.div
                                        whileHover={{ y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleSubjectTransition("PHYSICS")}
                                        className="group relative bg-gradient-to-br from-indigo-950/40 via-[#060a12]/80 to-[#060a12] rounded-3xl p-8 border border-indigo-500/20 hover:border-indigo-400/50 shadow-2xl cursor-pointer overflow-hidden flex flex-col justify-between h-52 transition-all duration-300"
                                    >
                                        {/* Animated Background Elements */}
                                        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-700 animate-pulse-glow" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />

                                        <div className="space-y-3 relative z-10">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:scale-110 transition-transform duration-300">
                                                <Atom className="w-6 h-6 animate-spin" style={{ animationDuration: "12s" }} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">Sector 01</span>
                                                <h3 className="text-2xl font-black text-white tracking-tight mt-0.5 group-hover:text-indigo-50 transition-colors">Physics Engine</h3>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-indigo-500/20">
                                            <span className="text-xs font-bold text-indigo-300 group-hover:translate-x-1 transition-transform flex items-center gap-1.5">
                                                <span>Engage Physics Deck</span>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </span>
                                            <span className="text-[10px] font-mono text-indigo-200/50 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/10">
                                                {Object.keys(chaptersBySubject.PHYSICS).length} Chapters
                                            </span>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        whileHover={{ y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleSubjectTransition("CHEMISTRY")}
                                        className="group relative bg-gradient-to-br from-amber-950/40 via-[#060a12]/80 to-[#060a12] rounded-3xl p-8 border border-amber-500/20 hover:border-amber-400/50 shadow-2xl cursor-pointer overflow-hidden flex flex-col justify-between h-52 transition-all duration-300"
                                    >
                                        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-600/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-all duration-700 animate-pulse-glow" style={{ animationDelay: '1s' }} />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />

                                        <div className="space-y-3 relative z-10">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] group-hover:scale-110 transition-transform duration-300">
                                                <FlaskConical className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">Sector 02</span>
                                                <h3 className="text-2xl font-black text-white tracking-tight mt-0.5 group-hover:text-amber-50 transition-colors">Chemistry Synthesis</h3>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-amber-500/20">
                                            <span className="text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform flex items-center gap-1.5">
                                                <span>Activate Chemistry Hub</span>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </span>
                                            <span className="text-[10px] font-mono text-amber-200/50 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/10">
                                                {Object.keys(chaptersBySubject.CHEMISTRY).length} Chapters
                                            </span>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* STATISTICS & CALENDAR */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4">
                                    <div className="lg:col-span-7 space-y-6">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Telemetry & Progress</h3>

                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { label: "Lectures Completed", value: completedCount, color: "text-cyan-400" },
                                                { label: "Chapters Active", value: chapterStats.length, color: "text-indigo-400" },
                                                { label: "Syllabus Coverage", value: `${completionPercentage}%`, color: "text-violet-400" }
                                            ].map((stat, i) => (
                                                <motion.div 
                                                    key={i}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="azs-card azs-glass p-5 flex flex-col justify-between items-center text-center group"
                                                >
                                                    <p className={`text-2xl sm:text-3xl font-black ${stat.color} drop-shadow-md group-hover:scale-110 transition-transform`}>{stat.value}</p>
                                                    <p className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-2 uppercase tracking-wide">{stat.label}</p>
                                                </motion.div>
                                            ))}
                                        </div>

                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recommended Lectures</h3>
                                                <button
                                                    onClick={() => { setActiveNav("lectures"); setSelectedChapter(null); }}
                                                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 transition-colors"
                                                >
                                                    View Vault <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {videos.slice(0, 4).map((v, i) => {
                                                    const isDone = watchedVideos.includes(v.id);
                                                    return (
                                                        <motion.div
                                                            key={v.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.05 }}
                                                            className="azs-card azs-glass-hover p-4 flex items-center justify-between group"
                                                        >
                                                            <div className="flex items-center space-x-4">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                                                    v.subject === "PHYSICS"
                                                                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20"
                                                                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20"
                                                                    }`}
                                                                >
                                                                    #{v.lecture_no}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-cyan-100 transition-colors">
                                                                        {v.topic || v.title}
                                                                    </h4>
                                                                    <p className="text-[11px] text-slate-400 mt-0.5">{v.chapter}</p>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => toggleWatchStatus(v.id)}
                                                                className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all shrink-0 ${
                                                                    isDone
                                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                                                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white"
                                                                    }`}
                                                            >
                                                                {isDone ? "✓ Done" : "Watch"}
                                                            </button>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-5 space-y-6">
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="azs-card azs-glass p-6 space-y-5"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-sm font-extrabold text-white tracking-wide">{currentMonthTitle}</h4>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Click any date to schedule a study plan</p>
                                                </div>
                                                <div className="flex items-center space-x-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
                                                    <button
                                                        onClick={handlePrevMonth}
                                                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
                                                        title="Previous Month"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={handleNextMonth}
                                                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
                                                        title="Next Month"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                                            </div>

                                            <div className="grid grid-cols-7 text-center text-xs gap-y-2 gap-x-1 font-semibold">
                                                {Array.from({ length: startDayOfMonth }).map((_, i) => (
                                                    <span key={`empty-${i}`} className="text-slate-800">
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
                                                                className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all relative ${
                                                                    isToday
                                                                    ? "bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                                                                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                                                                    }`}
                                                            >
                                                                <span>{dayNum}</span>
                                                                {hasPlans && (
                                                                    <span
                                                                        className={`w-1.5 h-1.5 rounded-full absolute -bottom-1 shadow-sm ${
                                                                            isToday ? "bg-white" : "bg-cyan-400"
                                                                        }`}
                                                                    />
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* VIEW: CHAPTER-WISE VIDEO LECTURES & MATERIALS */}
                        {!isExpired && !isSearchActive && activeNav === "lectures" && (
                            <motion.div 
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black text-white flex items-center gap-3">
                                            <AnimatePresence>
                                                {selectedChapter && (
                                                    <motion.button
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        onClick={() => setSelectedChapter(null)}
                                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10"
                                                        title="Back to Chapters"
                                                    >
                                                        <ArrowLeft className="w-4 h-4" />
                                                    </motion.button>
                                                )}
                                            </AnimatePresence>
                                            <span className="azs-gradient-text">
                                                {selectedChapter ? `Chapter: ${selectedChapter}` : "Video Lectures Vault"}
                                            </span>
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {selectedChapter
                                                ? "Select a lecture below to start streaming or take personal notes."
                                                : "Select a chapter below to view categorized lectures."}
                                        </p>
                                    </div>

                                    {!selectedChapter && (
                                        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                                            <button
                                                onClick={() => setSelectedSubjectTab("PHYSICS")}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                                    selectedSubjectTab === "PHYSICS"
                                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                                                    }`}
                                            >
                                                <Atom className="w-3.5 h-3.5" />
                                                <span>Physics</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedSubjectTab("CHEMISTRY")}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                                    selectedSubjectTab === "CHEMISTRY"
                                                    ? "bg-amber-600 text-white shadow-lg shadow-amber-500/25"
                                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                                                    }`}
                                            >
                                                <FlaskConical className="w-3.5 h-3.5" />
                                                <span>Chemistry</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {!selectedChapter && (
                                    <motion.div layout>
                                        {Object.keys(currentSubjectChapters).length === 0 ? (
                                            <div className="azs-card azs-glass rounded-3xl p-16 text-center text-slate-400 text-xs space-y-4">
                                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2">
                                                    <FolderOpen className="w-8 h-8 text-slate-500" />
                                                </div>
                                                <p className="font-bold text-slate-300 text-sm">No chapters found for {selectedSubjectTab}.</p>
                                                <p className="text-slate-500 max-w-sm mx-auto">Lectures uploaded by admin will automatically appear categorized here.</p>
                                            </div>
                                        ) : (
                                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {Object.entries(currentSubjectChapters).map(([chName, chVideos], idx) => {
                                                    const chMaterials = materialsByChapter[chName] || [];
                                                    const completedInCh = chVideos.filter(v => watchedVideos.includes(v.id)).length;
                                                    const chProgress = chVideos.length > 0 ? Math.round((completedInCh / chVideos.length) * 100) : 0;
                                                    const isPhysics = selectedSubjectTab === "PHYSICS";

                                                    return (
                                                        <motion.div
                                                            key={chName}
                                                            initial={{ opacity: 0, y: 15 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            onClick={() => setSelectedChapter(chName)}
                                                            className="group azs-card azs-glass-hover rounded-3xl p-6 cursor-pointer flex flex-col justify-between space-y-6 relative overflow-hidden"
                                                        >
                                                            {/* Hover Ambient Glow */}
                                                            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isPhysics ? 'bg-indigo-500/20' : 'bg-amber-500/20'}`} />

                                                            <div className="space-y-4 relative z-10">
                                                                <div className="flex items-center justify-between">
                                                                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-xs shadow-inner ${
                                                                        isPhysics ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                                                    }`}>
                                                                        <FolderOpen className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="text-[10px] font-mono text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 backdrop-blur-sm">
                                                                        {chVideos.length} Lec | {chMaterials.length} PDF
                                                                    </span>
                                                                </div>

                                                                <div>
                                                                    <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors leading-snug">
                                                                        {chName}
                                                                    </h3>
                                                                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-1.5 tracking-wider flex items-center gap-1.5">
                                                                        {isPhysics ? <Atom className="w-3 h-3 text-indigo-400" /> : <FlaskConical className="w-3 h-3 text-amber-400" />}
                                                                        {selectedSubjectTab} Sector
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3 relative z-10 pt-4 border-t border-white/10">
                                                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                                                                    <span>Completion</span>
                                                                    <span className="font-mono text-slate-200">{completedInCh}/{chVideos.length} ({chProgress}%)</span>
                                                                </div>
                                                                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                                                                    <div className={`h-full rounded-full transition-all duration-700 relative overflow-hidden ${isPhysics ? 'bg-gradient-to-r from-indigo-600 to-cyan-400' : 'bg-gradient-to-r from-amber-600 to-yellow-400'}`} style={{ width: `${chProgress}%` }}>
                                                                        <div className="absolute inset-0 bg-white/20 w-full animate-shimmer" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {selectedChapter && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="space-y-6"
                                    >
                                        {/* Horizontal Swipeable Chapter Carousel on Mobile */}
                                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                                            {Object.keys(currentSubjectChapters).map((ch) => (
                                                <button
                                                    key={ch}
                                                    onClick={() => setSelectedChapter(ch)}
                                                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
                                                        selectedChapter === ch
                                                            ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/20 border border-transparent"
                                                            : "bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:bg-white/10"
                                                    }`}
                                                >
                                                    {ch}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {(currentSubjectChapters[selectedChapter] || []).map((vid, i) => {
                                                const embedUrl = getYouTubeEmbedUrl(vid.youtube_url || vid.video_url || "");
                                                const isWatched = watchedVideos.includes(vid.id);
                                                const isNotesOpen = openNotesId === vid.id;
                                                const hasNotes = Boolean(lectureNotes[vid.id]?.trim());

                                                return (
                                                    <motion.div
                                                        key={vid.id}
                                                        initial={{ opacity: 0, y: 15 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        id={`lecture-card-${vid.id}`}
                                                        className={`azs-card azs-glass rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                                                            isWatched ? "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : ""
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="aspect-video w-full bg-black relative border-b border-white/10 group">
                                                                {embedUrl ? (
                                                                    <iframe
                                                                        src={embedUrl}
                                                                        title={vid.topic || vid.title || "Lecture"}
                                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                        allowFullScreen
                                                                        className="w-full h-full border-none"
                                                                    />
                                                                ) : (
                                                                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                                                                        Invalid Video Link
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="p-5 space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-white/10 text-slate-300 border border-white/10">
                                                                        Lecture #{vid.lecture_no}
                                                                    </span>
                                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                                                                        vid.subject === "PHYSICS" ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                                                    }`}>
                                                                        {vid.subject}
                                                                    </span>
                                                                </div>

                                                                <h3 className="font-black text-sm text-white line-clamp-2 leading-tight">
                                                                    {vid.topic || vid.title}
                                                                </h3>
                                                                <p className="text-[11px] font-medium text-slate-400">{vid.chapter}</p>
                                                            </div>
                                                        </div>

                                                        <div className="p-5 pt-0 space-y-3">
                                                            <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40 transition-colors hover:border-white/20">
                                                                <button
                                                                    onClick={() => setOpenNotesId(isNotesOpen ? null : vid.id)}
                                                                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <FileEdit className="w-3.5 h-3.5 text-cyan-400" />
                                                                        <span>My Notes</span>
                                                                        {hasNotes && (
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)] animate-pulse" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                                        {saveStatus[vid.id] && (
                                                                            <span className="text-emerald-400 font-semibold text-[10px]">Saved!</span>
                                                                        )}
                                                                        <motion.div animate={{ rotate: isNotesOpen ? 180 : 0 }}>
                                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                                        </motion.div>
                                                                    </div>
                                                                </button>

                                                                <AnimatePresence>
                                                                    {isNotesOpen && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: "auto", opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            className="overflow-hidden"
                                                                        >
                                                                            <div className="p-3 bg-white/5 border-t border-white/10 space-y-3">
                                                                                <textarea
                                                                                    rows={4}
                                                                                    placeholder="Jot down key formulas, tips, or timestamps here..."
                                                                                    value={lectureNotes[vid.id] || ""}
                                                                                    onChange={(e) => handleNoteChange(vid.id, e.target.value)}
                                                                                    className="azs-input resize-none text-[11px] p-2.5 w-full bg-black/50"
                                                                                />

                                                                                <div className="flex items-center justify-between">
                                                                                    <button
                                                                                        onClick={() => handleAddTimestampTag(vid.id)}
                                                                                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                                                                                    >
                                                                                        <Clock className="w-3 h-3" />
                                                                                        <span>+ Tag Timestamp</span>
                                                                                    </button>

                                                                                    {hasNotes && (
                                                                                        <button
                                                                                            onClick={() => handleExportNotes(vid)}
                                                                                            className="text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                                                                                            title="Download as TXT file"
                                                                                        >
                                                                                            <Download className="w-3 h-3" />
                                                                                            <span>Export</span>
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>

                                                            <button
                                                                onClick={() => toggleWatchStatus(vid.id)}
                                                                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                                                                    isWatched
                                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                                                    : "azs-btn-primary"
                                                                    }`}
                                                            >
                                                                <span>{isWatched ? "✓ Completed" : "Mark as Watched"}</span>
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>

                                        {/* CHAPTER-WISE STUDY SHEETS / PDF MATERIALS */}
                                        {(materialsByChapter[selectedChapter] || []).length > 0 && (
                                            <div className="space-y-5 pt-8 mt-4 border-t border-white/10">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-cyan-400" />
                                                    Study Sheets & Handouts
                                                </h3>
                                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {(materialsByChapter[selectedChapter] || []).map((mat, idx) => {
                                                        const rawFileUrl = mat.pdf_url || mat.file_url || "";
                                                        const drivePreviewLink = getDrivePreviewUrl(rawFileUrl);

                                                        return (
                                                            <motion.div
                                                                key={mat.id}
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: idx * 0.1 }}
                                                                className="azs-card azs-glass-hover rounded-2xl p-5 flex flex-col justify-between space-y-5 group"
                                                            >
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/10">
                                                                            {mat.subject}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{mat.chapter}</span>
                                                                    </div>

                                                                    <div className="flex items-start space-x-3">
                                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black text-[10px] shrink-0 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                                                                            PDF
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="font-bold text-sm text-white leading-tight group-hover:text-cyan-200 transition-colors line-clamp-2">{mat.title}</h3>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                                                    <button
                                                                        onClick={() => {
                                                                            setPreviewPdfUrl(drivePreviewLink);
                                                                            setPreviewPdfTitle(mat.title);
                                                                        }}
                                                                        className="flex-1 azs-btn-cyan text-xs py-2.5 rounded-xl flex items-center justify-center space-x-1.5"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                        <span>Preview</span>
                                                                    </button>

                                                                    <a
                                                                        href={rawFileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors border border-white/10 flex items-center justify-center"
                                                                        title="Open in new tab / Download"
                                                                    >
                                                                        <ExternalLink className="w-4 h-4" />
                                                                    </a>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                                               {/* VIEW: STUDY MATERIALS (PDF TAB DIRECT) */}
                        {!isExpired && !isSearchActive && activeNav === "materials" && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-xl font-black tracking-tight">
                                        <span className="azs-gradient-text">Study Materials & Handouts</span>
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">
                                        All downloadable PDFs and problem sheets categorized by chapters.
                                    </p>
                                </div>

                                {materials.length === 0 ? (
                                    <div className="azs-card azs-glass rounded-3xl p-16 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                                            <FileText className="w-8 h-8 text-slate-500" />
                                        </div>
                                        <p className="font-bold text-slate-300 text-sm">No study sheets uploaded yet.</p>
                                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                            PDFs and handouts added by admin will appear here automatically.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {materials.map((mat, idx) => {
                                            const rawFileUrl = mat.pdf_url || mat.file_url || "";
                                            const drivePreviewLink = getDrivePreviewUrl(rawFileUrl);
                                            const isPhysics = mat.subject === "PHYSICS";

                                            return (
                                                <motion.div
                                                    key={mat.id}
                                                    initial={{ opacity: 0, y: 12 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.04 }}
                                                    className="azs-card azs-glass-hover rounded-2xl p-5 flex flex-col justify-between space-y-5 group relative overflow-hidden"
                                                >
                                                    <div
                                                        className={`absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                                                            isPhysics ? "bg-indigo-500/20" : "bg-amber-500/20"
                                                        }`}
                                                    />

                                                    <div className="space-y-4 relative z-10">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span
                                                                className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                                                                    isPhysics
                                                                        ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                                                                        : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                                                }`}
                                                            >
                                                                {mat.subject}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                                                                {mat.chapter}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-start space-x-3">
                                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black text-[10px] shrink-0 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                                                                PDF
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="font-bold text-sm text-white leading-snug group-hover:text-cyan-200 transition-colors line-clamp-2">
                                                                    {mat.title}
                                                                </h3>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 pt-2 border-t border-white/5 relative z-10">
                                                        <button
                                                            onClick={() => {
                                                                setPreviewPdfUrl(drivePreviewLink);
                                                                setPreviewPdfTitle(mat.title);
                                                            }}
                                                            className="flex-1 azs-btn-cyan text-xs py-2.5 rounded-xl flex items-center justify-center space-x-1.5"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>Preview</span>
                                                        </button>

                                                        <a
                                                            href={rawFileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors border border-white/10 flex items-center justify-center"
                                                            title="Open in new tab / Download"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* VIEW: INTEGRATED AI TUTOR (FULL PAGE) */}
                        {!isExpired && !isSearchActive && activeNav === "ai" && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="h-[calc(100vh-140px)] min-h-[640px] rounded-3xl overflow-hidden border border-white/10 azs-glass shadow-2xl relative"
                            >
                                <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5" />
                                <div className="relative h-full z-10">
                                    <EduTrackAiChat isEmbedded={true} />
                                </div>
                            </motion.div>
                        )}
                    </main>

                    {/* DEVELOPER CREDIT FOOTER */}
                    <footer className="w-full py-6 px-6 text-center border-t border-white/5 bg-[#060a12]/80 backdrop-blur-xl mt-auto">
                        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center space-y-2">
                            <div className="flex md:hidden items-center justify-center space-x-2 text-xs text-slate-300 font-bold mb-1">
                                <span className="text-cyan-400/90">Academic Guide:</span>
                                <a
                                    href={TEACHER_SOCIAL.whatsapp}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
                                >
                                    {TEACHER_SOCIAL.name}
                                </a>
                            </div>

                            <p className="text-xs text-slate-400 font-medium tracking-wide">
                                © {currentYear} AZS: The Catalyst • Developed with ❤️ by{" "}
                                <a
                                    href="https://www.linkedin.com/in/sajedul-islam-data/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors inline-flex items-center gap-1"
                                >
                                    Mir Mohammad Sajedul Islam
                                    <ExternalLink className="w-3 h-3 inline" />
                                </a>
                            </p>
                        </div>
                    </footer>
                </div>
            </div>

            {/* FLOATING AI CHAT BUTTON & POPUP WIDGET */}
            {!isExpired && activeNav !== "ai" && (
                <>
                    {!isFloatingChatOpen ? (
                        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-5 z-40">
                            <motion.button
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => setIsFloatingChatOpen(true)}
                                className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-full shadow-[0_0_30px_rgba(99,102,241,0.45)] flex items-center justify-center transition-all group relative border border-white/20"
                                title="Ask AI Tutor"
                            >
                                <span className="absolute inset-0 rounded-full bg-indigo-400/30 animate-ping opacity-40" />
                                <Bot className="w-7 h-7 text-white relative z-10" />
                                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#060a12] rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            </motion.button>
                        </div>
                    ) : (
                        <EduTrackAiChat isOpen={true} onClose={() => setIsFloatingChatOpen(false)} />
                    )}
                </>
            )}

            {/* 3. STUDY PLANNER MODAL */}
            <AnimatePresence>
                {selectedDateForPlan && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedDateForPlan(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ type: "spring", stiffness: 380, damping: 28 }}
                            onClick={(e) => e.stopPropagation()}
                            className="azs-card azs-glass border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative overflow-hidden"
                        >
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
                                <div>
                                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-cyan-400" />
                                        <span>Study Planner</span>
                                    </h3>
                                    <p className="text-xs text-slate-400 font-mono mt-0.5">Date: {selectedDateForPlan}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedDateForPlan(null)}
                                    className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 relative z-10">
                                {studyPlans.filter((p) => p.dateKey === selectedDateForPlan).length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-5 bg-white/5 rounded-2xl border border-white/10">
                                        No study plans set for this day yet.
                                    </p>
                                ) : (
                                    studyPlans
                                        .filter((p) => p.dateKey === selectedDateForPlan)
                                        .map((p) => (
                                            <div
                                                key={p.id}
                                                className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/10 text-xs transition-colors"
                                            >
                                                <div className="space-y-0.5 min-w-0">
                                                    <p className="font-bold text-white truncate">{p.title}</p>
                                                    {p.time && (
                                                        <p className="text-[10px] text-cyan-400/80 font-mono">{p.time}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDeletePlan(p.id)}
                                                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors shrink-0"
                                                    title="Remove plan"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                )}
                            </div>

                            <form onSubmit={handleAddPlan} className="space-y-3 pt-2 border-t border-white/10 relative z-10">
                                <label className="text-xs font-bold text-slate-300 block">Add Goal / Revision Plan</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Complete Reflection of Light CQ-01"
                                    value={newPlanTitle}
                                    onChange={(e) => setNewPlanTitle(e.target.value)}
                                    className="azs-input w-full rounded-2xl px-4 py-2.5 text-xs"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Target Time (e.g. 8:00 PM)"
                                        value={newPlanTime}
                                        onChange={(e) => setNewPlanTime(e.target.value)}
                                        className="azs-input flex-1 rounded-2xl px-4 py-2 text-xs"
                                    />
                                    <button
                                        type="submit"
                                        className="azs-btn-primary px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Save Plan</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. PDF IN-APP PREVIEW MODAL */}
            <AnimatePresence>
                {previewPdfUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#060a12]/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-6"
                        onClick={() => setPreviewPdfUrl(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 8 }}
                            transition={{ type: "spring", stiffness: 340, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="azs-glass border border-white/10 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl"
                        >
                            <div className="px-5 sm:px-6 py-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-3">
                                <div className="flex items-center space-x-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-black text-[10px] shrink-0">
                                        PDF
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-extrabold text-white leading-tight truncate">
                                            {previewPdfTitle || "Document Preview"}
                                        </h3>
                                        <p className="text-[10px] text-slate-400">AZS: The Catalyst — Document Reader</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0">
                                    <a
                                        href={previewPdfUrl.replace("/preview", "/view")}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Open in Drive</span>
                                    </a>
                                    <button
                                        onClick={() => setPreviewPdfUrl(null)}
                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/10"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 w-full bg-black/60 relative">
                                <iframe
                                    src={previewPdfUrl}
                                    title={previewPdfTitle}
                                    className="w-full h-full border-none"
                                    allow="autoplay"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MOBILE STICKY BOTTOM NAVIGATION DOCK (Thumb Zone Optimized) */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#060a12]/92 backdrop-blur-2xl border-t border-white/10 px-2 py-2 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.45)]">
                <button
                    onClick={() => {
                        setActiveNav("dashboard");
                        setSelectedChapter(null);
                        setIsMobileSidebarOpen(false);
                    }}
                    className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all active:scale-95 ${
                        activeNav === "dashboard"
                            ? "text-cyan-400 font-bold bg-cyan-500/10"
                            : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="text-[10px] tracking-tight">ড্যাশবোর্ড</span>
                </button>

                <button
                    onClick={() => {
                        setActiveNav("lectures");
                        setSelectedChapter(null);
                        setIsMobileSidebarOpen(false);
                    }}
                    className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all active:scale-95 ${
                        activeNav === "lectures"
                            ? "text-cyan-400 font-bold bg-cyan-500/10"
                            : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                    <PlayCircle className="w-5 h-5" />
                    <span className="text-[10px] tracking-tight">ক্লাস</span>
                </button>

                <button
                    onClick={() => {
                        setActiveNav("materials");
                        setSelectedChapter(null);
                        setIsMobileSidebarOpen(false);
                    }}
                    className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all active:scale-95 ${
                        activeNav === "materials"
                            ? "text-cyan-400 font-bold bg-cyan-500/10"
                            : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                    <FileText className="w-5 h-5" />
                    <span className="text-[10px] tracking-tight">শিট</span>
                </button>

                <button
                    onClick={() => {
                        setActiveNav("ai");
                        setSelectedChapter(null);
                        setIsMobileSidebarOpen(false);
                    }}
                    className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all active:scale-95 ${
                        activeNav === "ai"
                            ? "text-indigo-300 font-bold bg-indigo-500/15"
                            : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                    <Bot className={`w-5 h-5 ${activeNav === "ai" ? "text-indigo-300" : "text-indigo-400/80"}`} />
                    <span className="text-[10px] tracking-tight">AI টিউটর</span>
                </button>
            </nav>
        </div>
    );
}

export default function StudentDashboardPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#060a12] flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
                    <div className="azs-orb opacity-40" />
                    <div className="azs-orb-cyan opacity-30" style={{ top: "20%", left: "15%" }} />
                    <div className="relative z-10 flex flex-col items-center space-y-4">
                        <div className="w-12 h-12 border-[3px] border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_20px_rgba(34,211,238,0.35)]" />
                        <p className="text-xs font-bold text-slate-400 tracking-[0.2em] font-mono uppercase">
                            Initializing Cyber Deck…
                        </p>
                    </div>
                </div>
            }
        >
            <DashboardContent />
        </Suspense>
    );
}
