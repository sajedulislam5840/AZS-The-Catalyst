"use client";

import React, {
  useState,
  useEffect,
  useMemo,
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
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Bell,
  SearchX,
  X,
  Trash2,
  FileEdit,
  Download,
  ChevronDown,
  Eye,
  MessageCircle,
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
import SiteFooter from "@/components/SiteFooter";
import { TEACHER } from "@/lib/social";

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

  // Vibrant Loading Screen Sequence
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

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

  // --- MOBILE BACK BUTTON GUARD & INITIALIZATION ---
  useEffect(() => {
    setMounted(true);

    // Catalyst Initiation Progress Bar Sequence
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsInitializing(false), 300);
          return 100;
        }
        return prev + 20;
      });
    }, 150);

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
        clearInterval(interval);
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

  // --- CHAPTER-WISE GROUPING LOGIC ---
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
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const currentYearCalendar = calendarViewDate
    ? calendarViewDate.getFullYear()
    : 2025;
  const currentMonthCalendar = calendarViewDate
    ? calendarViewDate.getMonth()
    : 0;
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

  // --- CATALYST INITIALIZATION LOADING SCREEN ---
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 font-sans selection:bg-blue-100">
        <div className="max-w-sm w-full space-y-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-white border border-[#E6E1D8] shadow-lg flex items-center justify-center p-3 animate-pulse">
            <img
              src="/logo.png"
              alt="AZS Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-[#1E3A8A] tracking-tight">
              Igniting Catalyst Engine...
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              Synchronizing academic deck &amp; progress telemetry
            </p>
          </div>
          <div className="w-full bg-[#E6E1D8] h-2.5 rounded-full overflow-hidden p-0.5">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1E3A8A] via-[#0369A1] to-[#047857] rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${loadingProgress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col font-sans antialiased relative overflow-x-hidden selection:bg-blue-100 transition-colors duration-700 ${
        activeNav === "lectures" && selectedSubjectTab === "PHYSICS"
          ? "bg-sky-50/20"
          : activeNav === "lectures" && selectedSubjectTab === "CHEMISTRY"
          ? "bg-emerald-50/20"
          : ""
      }`}
    >
      {/* SUBJECT TRANSITION OVERLAY */}
      <AnimatePresence>
        {activeTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] bg-[#FAF8F5]/95 backdrop-blur-md flex flex-col items-center justify-center"
          >
            {activeTransition === "PHYSICS" ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="flex flex-col items-center space-y-6"
              >
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-sky-300 animate-ping" />
                  <div className="w-16 h-16 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center shadow-lg shadow-sky-500/10">
                    <Atom className="w-8 h-8 text-[#0369A1] animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-mono tracking-widest text-[#0369A1] uppercase font-bold">
                    Quantum Sector
                  </span>
                  <h3 className="text-lg font-black text-[#1E3A8A]">
                    Activating Physics Engine...
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
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-300 animate-ping" />
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                    <FlaskConical className="w-8 h-8 text-[#047857] animate-bounce" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-mono tracking-widest text-[#047857] uppercase font-bold">
                    Synthesis Sector
                  </span>
                  <h3 className="text-lg font-black text-[#1E3A8A]">
                    Opening Chemistry Vault...
                  </h3>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex min-w-0 relative z-10">
        {/* MOBILE SIDEBAR OVERLAY BACKDROP */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* LEFT SIDEBAR (Nord Cream) */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-[#E6E1D8] p-5 flex flex-col justify-between shrink-0 shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out ${
            isMobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="space-y-6">
            {/* Brand Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 px-1">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#E6E1D8] shadow-sm flex items-center justify-center shrink-0 p-2">
                  <img
                    src="/logo.png"
                    alt="AZS Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="font-black text-base text-[#1E3A8A] block leading-tight">
                    AZS
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#0369A1] block">
                    The Catalyst
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="md:hidden text-slate-400 hover:text-slate-700 p-2 rounded-xl bg-slate-50 border border-[#E6E1D8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Options */}
            <nav className="space-y-2">
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
                      <span className="ml-auto text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono border border-[#E6E1D8]">
                        {videos.length}
                      </span>
                    ),
                  },
                  {
                    id: "materials" as const,
                    label: "Study Sheets",
                    icon: FileText,
                    extra: (
                      <span className="ml-auto text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono border border-[#E6E1D8]">
                        {materials.length}
                      </span>
                    ),
                  },
                  {
                    id: "ai" as const,
                    label: "AI Tutor Core",
                    icon: Bot,
                    extra: (
                      <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
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
                  className={`w-full flex items-center space-x-3 px-4 min-h-[48px] rounded-xl text-sm font-bold transition-all ${
                    activeNav === id
                      ? "bg-[#1E3A8A] text-white shadow-lg shadow-blue-900/10"
                      : "text-slate-600 hover:text-[#1E3A8A] hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      activeNav === id
                        ? "text-white"
                        : id === "ai"
                        ? "text-[#0369A1]"
                        : "text-slate-400"
                    }`}
                  />
                  <span>{label}</span>
                  {extra}
                </button>
              ))}
            </nav>
          </div>

          {/* Student Card & Logout */}
          <div className="pt-5 border-t border-[#E6E1D8]">
            <div className="flex items-center justify-between gap-2">
              <div className="overflow-hidden">
                <p className="text-xs font-black text-slate-900 truncate">
                  {userProfile.full_name}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold truncate">
                  {userProfile.batch_no || "General Batch"}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-100 shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN WORKSPACE */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
          {/* Top Header Bar */}
          <header className="h-16 sm:h-20 bg-white/80 backdrop-blur-md border-b border-[#E6E1D8] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#E6E1D8] text-slate-600 flex md:hidden items-center justify-center shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search topic or chapter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-11 pr-9 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/20 focus:border-[#0369A1]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="hidden sm:flex items-center space-x-2 px-3.5 h-10 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-800">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Streak Active</span>
              </div>

              <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#E6E1D8] flex items-center justify-center relative text-slate-600">
                <Bell className="w-5 h-5" />
                {notice && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute top-3 right-3 animate-ping" />
                )}
              </div>
            </div>
          </header>

          {/* SUBSCRIPTION EXPIRED / EXPIRING ALERT */}
          {(isExpired || isExpiringSoon) && (
            <div
              className={`px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b ${
                isExpired
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {isExpired
                      ? "Subscription Expired — Content Locked"
                      : `Payment Reminder: ${daysLeft} ${
                          daysLeft === 1 ? "Day" : "Days"
                        } Remaining`}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isExpired
                      ? "Your coaching pass has ended. Streaming and materials are locked until payment is cleared."
                      : "Please renew your account subscription before expiration to avoid interruption."}
                  </p>
                </div>
              </div>

              <a
                href={TEACHER.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto h-12 px-6 bg-[#1E3A8A] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 shadow-md"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay / Renew via WhatsApp</span>
              </a>
            </div>
          )}

          {/* Notice Banner Strip */}
          {notice && (
            <div className="bg-[#1E3A8A] text-white px-6 py-3 flex items-center space-x-3 shadow-inner">
              <span className="px-2 py-0.5 rounded bg-white/20 text-white font-black text-[10px] uppercase">
                Notice
              </span>
              <p className="text-xs font-semibold flex-1 truncate">
                {notice.content}
              </p>
            </div>
          )}

          <main className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-8 flex-1 pb-28 md:pb-12 relative z-10">
            {/* EXPIRED LOCK CARD */}
            {isExpired && (
              <div className="bg-white border border-[#E6E1D8] rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2 max-w-lg mx-auto">
                  <h2 className="text-2xl font-black text-[#1E3A8A]">
                    Access Restricted
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Your student subscription has expired. Video streaming and
                    PDF study handouts are currently locked.
                  </p>
                </div>
                <a
                  href={TEACHER.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold items-center gap-2 shadow-md"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contact Academic Guide on WhatsApp</span>
                </a>
              </div>
            )}

            {/* SEARCH RESULTS VIEW */}
            {!isExpired && isSearchActive && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-2xl font-black text-[#1E3A8A] flex items-center gap-2">
                      <Search className="w-6 h-6 text-[#0369A1]" />
                      <span>Results for &ldquo;{searchQuery}&rdquo;</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Found {filteredVideos.length} lectures and{" "}
                      {filteredMaterials.length} study sheets.
                    </p>
                  </div>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="h-10 px-4 bg-white border border-[#E6E1D8] rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Clear Search
                  </button>
                </div>

                {!hasSearchResults ? (
                  <div className="bg-white border border-[#E6E1D8] rounded-3xl p-12 text-center space-y-4">
                    <SearchX className="w-12 h-12 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">
                      No matching academic material found.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {filteredVideos.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
                          Video Lectures ({filteredVideos.length})
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredVideos.map((vid) => {
                            const embedUrl = getYouTubeEmbedUrl(
                              vid.youtube_url || vid.video_url || ""
                            );
                            const isWatched = watchedVideos.includes(vid.id);

                            return (
                              <div
                                key={vid.id}
                                className="bg-white border border-[#E6E1D8] rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm"
                              >
                                <div>
                                  <div className="aspect-video bg-slate-900">
                                    <iframe
                                      src={embedUrl}
                                      title={vid.topic || "Lecture"}
                                      className="w-full h-full border-none"
                                      allowFullScreen
                                    />
                                  </div>
                                  <div className="p-5 space-y-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-[#E6E1D8]">
                                      Lec #{vid.lecture_no} · {vid.subject}
                                    </span>
                                    <h4 className="font-bold text-sm text-slate-900 line-clamp-2">
                                      {vid.topic || vid.title}
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                      {vid.chapter}
                                    </p>
                                  </div>
                                </div>
                                <div className="p-5 pt-0">
                                  <button
                                    onClick={() => toggleWatchStatus(vid.id)}
                                    className={`w-full h-12 rounded-xl text-xs font-bold ${
                                      isWatched
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-[#1E3A8A] text-white"
                                    }`}
                                  >
                                    {isWatched ? "✓ Watched" : "Mark as Watched"}
                                  </button>
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

            {/* VIEW: DASHBOARD OVERVIEW COMMAND DECK */}
            {!isExpired && !isSearchActive && activeNav === "dashboard" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-2xl font-black text-[#1E3A8A]">
                    Academic Command Deck
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Welcome back,{" "}
                    <strong className="text-slate-900">
                      {userProfile.full_name}
                    </strong>
                    . Select a subject launchpad below.
                  </p>
                </div>

                {/* Subject Launchpads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Physics Launcher */}
                  <div
                    onClick={() => handleSubjectTransition("PHYSICS")}
                    className="group bg-white border border-sky-200 hover:border-[#0369A1] rounded-3xl p-8 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                  >
                    <div className="space-y-3 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0369A1]">
                        <Atom className="w-7 h-7 animate-spin" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#0369A1] uppercase tracking-widest">
                          Sector 01
                        </span>
                        <h3 className="text-2xl font-black text-[#1E3A8A]">
                          Physics Engine
                        </h3>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-sky-100 flex items-center justify-between text-xs font-bold text-[#0369A1]">
                      <span>Open Physics Vault</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Chemistry Launcher */}
                  <div
                    onClick={() => handleSubjectTransition("CHEMISTRY")}
                    className="group bg-white border border-emerald-200 hover:border-[#047857] rounded-3xl p-8 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                  >
                    <div className="space-y-3 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#047857]">
                        <FlaskConical className="w-7 h-7 animate-bounce" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#047857] uppercase tracking-widest">
                          Sector 02
                        </span>
                        <h3 className="text-2xl font-black text-[#1E3A8A]">
                          Chemistry Lab
                        </h3>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-[#047857]">
                      <span>Open Chemistry Hub</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* Progress Stats & Calendar */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-7 space-y-6">
                    <h3 className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
                      Academic Telemetry
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {
                          label: "Completed",
                          value: completedCount,
                          color: "text-[#0369A1]",
                        },
                        {
                          label: "Chapters",
                          value: chapterStats.length,
                          color: "text-[#1E3A8A]",
                        },
                        {
                          label: "Coverage",
                          value: `${completionPercentage}%`,
                          color: "text-[#047857]",
                        },
                      ].map((stat, i) => (
                        <div
                          key={i}
                          className="bg-white border border-[#E6E1D8] p-5 rounded-2xl text-center shadow-sm"
                        >
                          <p className={`text-2xl font-black ${stat.color}`}>
                            {stat.value}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white border border-[#E6E1D8] rounded-3xl p-6 shadow-sm space-y-4">
                      <h4 className="text-sm font-bold text-slate-900">
                        Recommended Lectures
                      </h4>
                      <div className="space-y-3">
                        {videos.slice(0, 4).map((v) => {
                          const isDone = watchedVideos.includes(v.id);
                          return (
                            <div
                              key={v.id}
                              className="flex items-center justify-between p-3.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl gap-3"
                            >
                              <div className="flex items-center space-x-3 overflow-hidden">
                                <div
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                    v.subject === "PHYSICS"
                                      ? "bg-sky-100 text-[#0369A1]"
                                      : "bg-emerald-100 text-[#047857]"
                                  }`}
                                >
                                  #{v.lecture_no}
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-xs font-bold text-slate-900 truncate">
                                    {v.topic || v.title}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {v.chapter}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => toggleWatchStatus(v.id)}
                                className={`h-9 px-3 rounded-lg text-xs font-bold shrink-0 ${
                                  isDone
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-white border border-[#E6E1D8] text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {isDone ? "✓ Done" : "Watch"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Calendar Widget */}
                  <div className="lg:col-span-5">
                    <div className="bg-white border border-[#E6E1D8] rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-[#1E3A8A]">
                          {currentMonthTitle}
                        </h4>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={handlePrevMonth}
                            className="p-1.5 rounded-lg border border-[#E6E1D8] text-slate-600 hover:bg-slate-50"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleNextMonth}
                            className="p-1.5 rounded-lg border border-[#E6E1D8] text-slate-600 hover:bg-slate-50"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase">
                        <span>Su</span>
                        <span>Mo</span>
                        <span>Tu</span>
                        <span>We</span>
                        <span>Th</span>
                        <span>Fr</span>
                        <span>Sa</span>
                      </div>

                      <div className="grid grid-cols-7 text-center text-xs gap-1 font-semibold">
                        {Array.from({ length: startDayOfMonth }).map((_, i) => (
                          <span key={`empty-${i}`} className="text-slate-300">
                            -
                          </span>
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const dayNum = i + 1;
                          const dateKey = formatDateKey(
                            currentYearCalendar,
                            currentMonthCalendar,
                            dayNum
                          );
                          const isToday = dateKey === todayKey;
                          const hasPlans = studyPlans.some(
                            (p) => p.dateKey === dateKey
                          );

                          return (
                            <button
                              key={dayNum}
                              onClick={() => setSelectedDateForPlan(dateKey)}
                              className={`h-9 w-9 mx-auto flex items-center justify-center rounded-xl relative ${
                                isToday
                                  ? "bg-[#1E3A8A] text-white shadow-md"
                                  : "text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span>{dayNum}</span>
                              {hasPlans && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0369A1] absolute bottom-1" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW: CHAPTER-WISE LECTURES VAULT */}
            {!isExpired && !isSearchActive && activeNav === "lectures" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-[#1E3A8A] flex items-center gap-3">
                      {selectedChapter && (
                        <button
                          onClick={() => setSelectedChapter(null)}
                          className="w-10 h-10 rounded-full bg-white border border-[#E6E1D8] flex items-center justify-center text-slate-700 hover:bg-slate-50"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                      )}
                      <span>
                        {selectedChapter
                          ? `Chapter: ${selectedChapter}`
                          : "Video Lectures Vault"}
                      </span>
                    </h2>
                  </div>

                  {!selectedChapter && (
                    <div className="flex items-center bg-white border border-[#E6E1D8] rounded-2xl p-1 shadow-sm">
                      <button
                        onClick={() => setSelectedSubjectTab("PHYSICS")}
                        className={`h-10 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          selectedSubjectTab === "PHYSICS"
                            ? "bg-[#0369A1] text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Atom className="w-4 h-4" />
                        <span>Physics</span>
                      </button>
                      <button
                        onClick={() => setSelectedSubjectTab("CHEMISTRY")}
                        className={`h-10 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          selectedSubjectTab === "CHEMISTRY"
                            ? "bg-[#047857] text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <FlaskConical className="w-4 h-4" />
                        <span>Chemistry</span>
                      </button>
                    </div>
                  )}
                </div>

                {!selectedChapter ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(currentSubjectChapters).map(
                      ([chName, chVideos]) => {
                        const chMaterials = materialsByChapter[chName] || [];
                        const completedInCh = chVideos.filter((v) =>
                          watchedVideos.includes(v.id)
                        ).length;
                        const chProgress =
                          chVideos.length > 0
                            ? Math.round(
                                (completedInCh / chVideos.length) * 100
                              )
                            : 0;

                        return (
                          <div
                            key={chName}
                            onClick={() => setSelectedChapter(chName)}
                            className="bg-white border border-[#E6E1D8] hover:border-[#1E3A8A] rounded-3xl p-6 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6"
                          >
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-[#E6E1D8] flex items-center justify-center text-[#1E3A8A]">
                                  <FolderOpen className="w-6 h-6" />
                                </div>
                                <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  {chVideos.length} Lec | {chMaterials.length} PDF
                                </span>
                              </div>
                              <div>
                                <h3 className="text-lg font-black text-slate-900 leading-snug">
                                  {chName}
                                </h3>
                              </div>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-[#E6E1D8]">
                              <div className="flex justify-between text-xs font-bold text-slate-600">
                                <span>Completion</span>
                                <span>{chProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#1E3A8A] rounded-full"
                                  style={{ width: `${chProgress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(currentSubjectChapters[selectedChapter] || []).map(
                        (vid) => {
                          const embedUrl = getYouTubeEmbedUrl(
                            vid.youtube_url || vid.video_url || ""
                          );
                          const isWatched = watchedVideos.includes(vid.id);
                          const isNotesOpen = openNotesId === vid.id;

                          return (
                            <div
                              key={vid.id}
                              className="bg-white border border-[#E6E1D8] rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between"
                            >
                              <div>
                                <div className="aspect-video bg-slate-900">
                                  <iframe
                                    src={embedUrl}
                                    title={vid.topic || "Lecture"}
                                    className="w-full h-full border-none"
                                    allowFullScreen
                                  />
                                </div>
                                <div className="p-5 space-y-3">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-[#E6E1D8]">
                                    Lec #{vid.lecture_no} · {vid.subject}
                                  </span>
                                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                                    {vid.topic || vid.title}
                                  </h3>
                                </div>
                              </div>

                              <div className="p-5 pt-0 space-y-3">
                                {/* Lecture Notes Drawer */}
                                <div className="border border-[#E6E1D8] rounded-xl overflow-hidden bg-[#FAF8F5]">
                                  <button
                                    onClick={() =>
                                      setOpenNotesId(
                                        isNotesOpen ? null : vid.id
                                      )
                                    }
                                    className="w-full px-4 h-11 flex items-center justify-between text-xs font-bold text-slate-700"
                                  >
                                    <div className="flex items-center gap-2">
                                      <FileEdit className="w-4 h-4 text-[#0369A1]" />
                                      <span>My Personal Notes</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4" />
                                  </button>

                                  {isNotesOpen && (
                                    <div className="p-3 bg-white border-t border-[#E6E1D8] space-y-3">
                                      <textarea
                                        rows={4}
                                        placeholder="Write key formulas or timestamps..."
                                        value={lectureNotes[vid.id] || ""}
                                        onChange={(e) =>
                                          handleNoteChange(vid.id, e.target.value)
                                        }
                                        className="w-full p-2.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs text-slate-900 outline-none"
                                      />
                                      <div className="flex justify-between text-[11px]">
                                        <button
                                          onClick={() =>
                                            handleAddTimestampTag(vid.id)
                                          }
                                          className="font-bold text-[#0369A1]"
                                        >
                                          + Add Timestamp
                                        </button>
                                        <button
                                          onClick={() => handleExportNotes(vid)}
                                          className="font-bold text-slate-600"
                                        >
                                          Export TXT
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => toggleWatchStatus(vid.id)}
                                  className={`w-full h-12 rounded-xl text-xs font-bold ${
                                    isWatched
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-[#1E3A8A] text-white"
                                  }`}
                                >
                                  {isWatched ? "✓ Completed" : "Mark as Watched"}
                                </button>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* VIEW: STUDY MATERIALS PDF TAB */}
            {!isExpired && !isSearchActive && activeNav === "materials" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-black text-[#1E3A8A]">
                    Study Materials &amp; PDFs
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Download lecture handouts and problem practice sheets.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {materials.map((mat) => {
                    const rawFileUrl = mat.pdf_url || mat.file_url || "";
                    const drivePreviewLink = getDrivePreviewUrl(rawFileUrl);

                    return (
                      <div
                        key={mat.id}
                        className="bg-white border border-[#E6E1D8] rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-sm"
                      >
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-[#E6E1D8]">
                            {mat.subject} · {mat.chapter}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                            {mat.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-[#E6E1D8]">
                          <button
                            onClick={() => {
                              setPreviewPdfUrl(drivePreviewLink);
                              setPreviewPdfTitle(mat.title);
                            }}
                            className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" /> Preview
                          </button>

                          <a
                            href={rawFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 bg-[#1E3A8A] text-white rounded-xl flex items-center justify-center shrink-0"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* VIEW: AI TUTOR CORE TAB */}
            {!isExpired && !isSearchActive && activeNav === "ai" && (
              <div className="h-[calc(100vh-140px)] min-h-[600px] rounded-3xl overflow-hidden border border-[#E6E1D8] bg-white shadow-sm">
                <EduTrackAiChat isEmbedded={true} />
              </div>
            )}
          </main>

          {/* Unified Site Footer */}
          <SiteFooter />
        </div>
      </div>

      {/* FLOATING AI CHAT WIDGET TRIGGER */}
      {!isExpired && activeNav !== "ai" && (
        <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-40">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFloatingChatOpen(true)}
            className="w-16 h-16 bg-[#1E3A8A] text-white rounded-full shadow-xl shadow-blue-900/20 flex items-center justify-center relative border-4 border-white"
          >
            <Bot className="w-7 h-7" />
            <span className="w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full absolute top-0 right-0" />
          </motion.button>
        </div>
      )}

      {/* FLOATING AI POPUP MODAL */}
      {isFloatingChatOpen && (
        <EduTrackAiChat
          isOpen={true}
          onClose={() => setIsFloatingChatOpen(false)}
        />
      )}

      {/* STUDY PLANNER MODAL */}
      <AnimatePresence>
        {selectedDateForPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDateForPlan(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-[#E6E1D8] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-[#E6E1D8] pb-3">
                <h3 className="font-bold text-slate-900 text-base">
                  Study Planner: {selectedDateForPlan}
                </h3>
                <button
                  onClick={() => setSelectedDateForPlan(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {studyPlans.filter((p) => p.dateKey === selectedDateForPlan)
                  .length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8]">
                    No revision task added for this day yet.
                  </p>
                ) : (
                  studyPlans
                    .filter((p) => p.dateKey === selectedDateForPlan)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center bg-[#FAF8F5] p-3 rounded-xl border border-[#E6E1D8] text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{p.title}</p>
                          {p.time && (
                            <p className="text-[10px] text-[#0369A1]">
                              {p.time}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeletePlan(p.id)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                )}
              </div>

              <form onSubmit={handleAddPlan} className="space-y-3 pt-2">
                <input
                  type="text"
                  required
                  placeholder="Task title (e.g. Physics CQ Revision)"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  className="w-full h-11 px-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs text-slate-900 outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Target time (e.g. 8:00 PM)"
                    value={newPlanTime}
                    onChange={(e) => setNewPlanTime(e.target.value)}
                    className="flex-1 h-11 px-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs text-slate-900 outline-none"
                  />
                  <button
                    type="submit"
                    className="h-11 px-4 bg-[#1E3A8A] text-white rounded-xl text-xs font-bold shrink-0"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF PREVIEW MODAL */}
      <AnimatePresence>
        {previewPdfUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewPdfUrl(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-[#E6E1D8] rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="px-6 h-16 bg-[#FAF8F5] border-b border-[#E6E1D8] flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm truncate">
                  {previewPdfTitle}
                </h3>
                <button
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-2 rounded-xl bg-white border border-[#E6E1D8] text-slate-600 hover:text-slate-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <iframe
                src={previewPdfUrl}
                title={previewPdfTitle}
                className="w-full flex-1 border-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE STICKY BOTTOM NAVIGATION DOCK (48px Touch Standard) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E6E1D8] h-20 px-2 flex items-center justify-around shadow-lg">
        {[
          { id: "dashboard" as const, label: "Home", icon: LayoutDashboard },
          { id: "lectures" as const, label: "Classes", icon: PlayCircle },
          { id: "materials" as const, label: "Sheets", icon: FileText },
          { id: "ai" as const, label: "AI Tutor", icon: Bot },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveNav(id);
              setSelectedChapter(null);
              setIsMobileSidebarOpen(false);
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] px-3 rounded-xl transition-all ${
              activeNav === id
                ? "text-[#1E3A8A] font-bold"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 font-sans">
          <div className="w-12 h-12 border-4 border-[#E6E1D8] border-t-[#1E3A8A] rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
