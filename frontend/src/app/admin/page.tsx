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
  Video,
  FileText,
  GraduationCap,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

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
  const [activeTab, setActiveTab] = useState<"students" | "video" | "sheet">(
    "students"
  );
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<
    string | number | null
  >(null);
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [sessionEmail, setSessionEmail] = useState("Admin");

  const [filterVideoSubject, setFilterVideoSubject] = useState<string>("ALL");
  const [filterVideoChapter, setFilterVideoChapter] = useState<string>("ALL");
  const [reordering, setReordering] = useState(false);

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

  const [editingLecture, setEditingLecture] = useState<LectureItem | null>(
    null
  );
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(
    null
  );
  const [savingEdit, setSavingEdit] = useState(false);

  const backendUrl = (
    process.env.NEXT_PUBLIC_API_URL || BACKEND_URL
  ).replace(/\/$/, "");

  const getToken = () => {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      ""
    );
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
    } fontinally: {
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
    setCurrentYear(new Date().getFullYear());

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const role = (localStorage.getItem("user_role") || "").toUpperCase();
    const email = (localStorage.getItem("user_email") || "").toLowerCase();
    setSessionEmail(email || localStorage.getItem("user_name") || "Admin");

    if (role !== "ADMIN" && email !== "rabbi@edutrack.com") {
      router.replace("/dashboard");
      return;
    }

    fetchStudents();
    fetchLectures();
    fetchMaterials();
  }, [router]);

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

  const uniqueChapters = useMemo(() => {
    const set = new Set<string>();
    lectures.forEach((l) => {
      if (l.chapter && l.chapter.trim()) {
        set.add(l.chapter.trim());
      }
    });
    return Array.from(set).sort();
  }, [lectures]);

  const sortedAndFilteredLectures = useMemo(() => {
    return lectures
      .filter((lec) => {
        const lecSubj = (lec.subject || "").trim().toLowerCase();
        const filtSubj = filterVideoSubject.trim().toLowerCase();
        const matchSubj =
          filterVideoSubject === "ALL" || lecSubj === filtSubj;

        const lecChap = (lec.chapter || "").trim().toLowerCase();
        const filtChap = filterVideoChapter.trim().toLowerCase();
        const matchChap =
          filterVideoChapter === "ALL" || lecChap === filtChap;

        return matchSubj && matchChap;
      })
      .sort((a, b) => a.lecture_no - b.lecture_no);
  }, [lectures, filterVideoSubject, filterVideoChapter]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const b = (s.batch_no && s.batch_no.trim()) || "General";
      const matchBatch =
        selectedBatch === "ALL" ||
        b.toLowerCase() === selectedBatch.toLowerCase();

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
    () =>
      filteredStudents.filter((s) => s.is_approved && s.days_left > 0).length,
    [filteredStudents]
  );
  const totalUnpaidInView = filteredStudents.length - totalPaidInView;

  const handleMarkPaid = async (studentId: string) => {
    setActionLoadingId(studentId);
    const token = getToken();
    try {
      const res = await fetch(
        `${backendUrl}/api/v1/admin/students/${studentId}/approve-and-pay`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) fetchStudents();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkUnpaid = async (studentId: string) => {
    if (
      !confirm(
        "Are you sure you want to mark this student as Unpaid? Access will be revoked."
      )
    )
      return;
    setActionLoadingId(studentId);
    const token = getToken();
    try {
      const res = await fetch(
        `${backendUrl}/api/v1/admin/students/${studentId}/revoke-access`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) fetchStudents();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteStudent = async (studentId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete student "${email}"?`
      )
    )
      return;
    setActionLoadingId(studentId);
    const token = getToken();
    try {
      const res = await fetch(
        `${backendUrl}/api/v1/admin/students/${studentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) fetchStudents();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

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
      const res = await fetch(
        `${backendUrl}/api/v1/admin/lectures/${editingLecture.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editingLecture),
        }
      );
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

  const handleSwapOrder = async (id1: string, id2: string) => {
    setReordering(true);
    const token = getToken();
    try {
      const res = await fetch(
        `${backendUrl}/api/v1/admin/lectures/swap-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lecture_id_1: id1, lecture_id_2: id2 }),
        }
      );
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

  const handleNormalizeChapter = async () => {
    if (filterVideoChapter === "ALL") {
      alert("Please select a specific chapter to auto-renumber.");
      return;
    }
    if (
      !confirm(
        `Auto-renumber all lectures in chapter "${filterVideoChapter}" from 1 to N?`
      )
    )
      return;

    setReordering(true);
    const token = getToken();
    try {
      const res = await fetch(
        `${backendUrl}/api/v1/admin/lectures/normalize-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject:
              filterVideoSubject === "ALL" ? "PHYSICS" : filterVideoSubject,
            chapter: filterVideoChapter,
          }),
        }
      );
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
      const res = await fetch(
        `${backendUrl}/api/v1/admin/lectures/${id}/toggle-publish`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
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

        const res = await fetch(
          `${backendUrl}/api/v1/academic/materials/upload`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );

        if (res.ok) {
          alert("PDF uploaded successfully from PC!");
          setSheetForm({
            title: "",
            chapter: "",
            subject: "Physics",
            file_url: "",
          });
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
          setSheetForm({
            title: "",
            chapter: "",
            subject: "Physics",
            file_url: "",
          });
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
      const res = await fetch(
        `${backendUrl}/api/v1/admin/materials/${editingMaterial.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editingMaterial),
        }
      );
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
      const res = await fetch(
        `${backendUrl}/api/v1/admin/materials/${id}/toggle-publish`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
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

  const totalStudentsCount = students.length;
  const totalActivePaidCount = useMemo(
    () => students.filter((s) => s.is_approved && s.days_left > 0).length,
    [students]
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0F172A] flex flex-col font-sans antialiased selection:bg-blue-100">
      {/* HEADER BAR */}
      <header className="border-b border-[#E6E1D8] bg-[#1E3A8A] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 min-h-[64px]">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 p-1">
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
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">
                  AZS
                </span>
                <span className="text-[10px] text-[#1E3A8A] font-mono px-2 py-0.5 bg-white rounded-md font-bold uppercase tracking-wider">
                  Admin Console
                </span>
              </div>
              <span className="text-xs text-blue-100 font-medium">
                The Catalyst Instructor Hub
              </span>
            </div>
          </div>

          <div className="order-3 w-full lg:order-none lg:w-auto flex items-center space-x-1.5 bg-[#0F172A]/20 p-1.5 rounded-2xl border border-white/20 overflow-x-auto">
            <button
              onClick={() => setActiveTab("students")}
              className={`flex items-center gap-2 px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${activeTab === "students"
                  ? "bg-white text-[#1E3A8A] shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
            >
              <Users className="w-4 h-4" />
              <span>Batch & Fees</span>
            </button>
            <button
              onClick={() => setActiveTab("video")}
              className={`flex items-center gap-2 px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${activeTab === "video"
                  ? "bg-white text-[#1E3A8A] shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
            >
              <Video className="w-4 h-4" />
              <span>Lectures</span>
            </button>
            <button
              onClick={() => setActiveTab("sheet")}
              className={`flex items-center gap-2 px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${activeTab === "sheet"
                  ? "bg-white text-[#1E3A8A] shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
            >
              <FileText className="w-4 h-4" />
              <span>Materials</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-white">
                {sessionEmail}
              </span>
              <span className="text-[10px] text-emerald-300 font-medium flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Active Admin
              </span>
            </div>

            <button
              onClick={() => {
                localStorage.clear();
                router.push("/login");
              }}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white hover:bg-rose-600 hover:border-rose-600 transition-colors shadow-sm"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN ADMIN WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* METRIC OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveTab("students")}
            className="bg-white border border-[#E6E1D8] hover:border-[#1E3A8A] rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center justify-between cursor-pointer transition-all group min-h-[96px]"
          >
            <div>
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Total Students
              </p>
              <p className="text-2xl font-black text-[#1E3A8A] mt-1">
                {totalStudentsCount}
              </p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                Click to manage batches
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1E3A8A] font-bold shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab("students")}
            className="bg-white border border-[#E6E1D8] hover:border-[#047857] rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center justify-between cursor-pointer transition-all group min-h-[96px]"
          >
            <div>
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Active Paid Pass
              </p>
              <p className="text-2xl font-black text-[#047857] mt-1">
                {totalActivePaidCount}
              </p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                Click for fee approvals
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857] font-bold shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab("video")}
            className="bg-white border border-[#E6E1D8] hover:border-[#0369A1] rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center justify-between cursor-pointer transition-all group min-h-[96px]"
          >
            <div>
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Recorded Lectures
              </p>
              <p className="text-2xl font-black text-[#0369A1] mt-1">
                {lectures.length}
              </p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                Click to manage videos
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center text-[#0369A1] font-bold shrink-0">
              <Video className="w-6 h-6" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab("sheet")}
            className="bg-white border border-[#E6E1D8] hover:border-[#1E3A8A] rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center justify-between cursor-pointer transition-all group min-h-[96px]"
          >
            <div>
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Handouts & Sheets
              </p>
              <p className="text-2xl font-black text-[#1E3A8A] mt-1">
                {materials.length}
              </p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                Click to manage PDFs
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#E6E1D8] flex items-center justify-center text-[#1E3A8A] font-bold shrink-0">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* TAB 1: BATCH REGISTRY & ACCESS CONTROL */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-[#1E3A8A] flex items-center gap-2.5">
                  <Layers className="w-6 h-6 text-[#0369A1]" />
                  <span>Batch Registry & Access Control</span>
                </h1>
                <p className="text-[#64748B] text-xs mt-1">
                  Instant batch segregation, real-time student search, and access
                  control.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-[#E6E1D8] px-3.5 h-11 rounded-xl text-xs font-mono shadow-sm">
                  <span className="text-[#047857] font-bold">
                    {totalPaidInView} Paid
                  </span>
                  <span className="text-[#94A3B8]">|</span>
                  <span className="text-amber-600 font-bold">
                    {totalUnpaidInView} Due
                  </span>
                </div>
                <button
                  onClick={fetchStudents}
                  className="flex items-center space-x-1.5 px-4 min-h-[48px] bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#1E3A8A] rounded-xl transition-colors shadow-sm border border-[#E6E1D8]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Batch Pill Bar & Search Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E6E1D8] shadow-sm">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                <button
                  onClick={() => setSelectedBatch("ALL")}
                  className={`flex items-center gap-2 px-3.5 min-h-[44px] text-xs font-bold rounded-xl transition-colors ${selectedBatch === "ALL"
                      ? "bg-[#1E3A8A] text-white shadow-sm"
                      : "text-[#64748B] hover:text-[#1E3A8A] hover:bg-[#FAF8F5]"
                    }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All Batches</span>
                  <span className="px-1.5 py-0.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-full text-[10px] text-[#334155] font-mono">
                    {students.length}
                  </span>
                </button>

                {batchList.map((batchName) => {
                  const count = students.filter(
                    (s) =>
                      ((s.batch_no && s.batch_no.trim()) || "General").toLowerCase() ===
                      batchName.toLowerCase()
                  ).length;

                  return (
                    <button
                      key={batchName}
                      onClick={() => setSelectedBatch(batchName)}
                      className={`flex items-center gap-2 px-3.5 min-h-[44px] text-xs font-bold rounded-xl transition-colors shrink-0 ${selectedBatch.toLowerCase() === batchName.toLowerCase()
                          ? "bg-[#1E3A8A] text-white shadow-sm"
                          : "text-[#64748B] hover:text-[#1E3A8A] hover:bg-[#FAF8F5]"
                        }`}
                    >
                      <span>{batchName}</span>
                      <span className="px-1.5 py-0.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-full text-[10px] text-[#334155] font-mono">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative min-w-[280px]">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by student name, email or school..."
                  value={searchStudentQuery}
                  onChange={(e) => setSearchStudentQuery(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl pl-10 pr-3.5 min-h-[48px] text-xs text-[#0F172A] focus:outline-none focus:border-[#1E3A8A] placeholder-[#94A3B8]"
                />
              </div>
            </div>

            {/* Students Table */}
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center text-[#64748B] space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#0369A1]" />
                <p className="text-xs font-medium">Loading batch records...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="bg-white border border-[#E6E1D8] rounded-2xl p-16 text-center text-[#64748B] text-xs space-y-2 shadow-sm">
                <p className="font-bold text-sm text-[#0F172A]">
                  No students found matching your criteria
                </p>
                <p>
                  Try clearing your search query or selecting a different batch
                  filter.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-[#E6E1D8] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[#1E3A8A] text-[11px] font-bold uppercase tracking-wider border-b border-[#E6E1D8]">
                      <tr>
                        <th className="py-4 px-5">#</th>
                        <th className="py-4 px-5">Student Information</th>
                        <th className="py-4 px-5">Institution & Class</th>
                        <th className="py-4 px-5">Batch ID</th>
                        <th className="py-4 px-5">Subscription Status</th>
                        <th className="py-4 px-5">Days Left</th>
                        <th className="py-4 px-5 text-right">
                          Fee & Access Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E1D8] font-sans">
                      {filteredStudents.map((student, index) => {
                        const isPaid =
                          student.is_approved && student.days_left > 0;

                        return (
                          <tr
                            key={student.id}
                            className="hover:bg-[#FAF8F5] transition-colors"
                          >
                            <td className="py-4 px-5 font-mono text-[#94A3B8]">
                              {index + 1}
                            </td>
                            <td className="py-4 px-5">
                              <div className="font-bold text-[#0F172A] text-[13px]">
                                {student.full_name}
                              </div>
                              <div className="text-[11px] text-[#64748B] font-mono mt-0.5">
                                {student.email}
                              </div>
                            </td>
                            <td className="py-4 px-5 text-[#334155]">
                              <div className="font-medium">
                                {student.school || "N/A"}
                              </div>
                              <div className="text-[10px] text-[#64748B] font-medium">
                                {student.grade_class || "Unassigned"}
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#E6E1D8] rounded-lg text-[11px] font-mono font-bold text-[#1E3A8A]">
                                {student.batch_no || "General"}
                              </span>
                            </td>
                            <td className="py-4 px-5">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Active Paid</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-800">
                                  <XCircle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Payment Due</span>
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-5 font-mono text-xs">
                              {isPaid ? (
                                <span className="text-[#047857] font-bold">
                                  {student.days_left} Days
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold">
                                  0 Days
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {!isPaid ? (
                                  <button
                                    onClick={() => handleMarkPaid(student.id)}
                                    disabled={actionLoadingId === student.id}
                                    className="px-3.5 min-h-[44px] rounded-xl text-xs font-bold bg-[#047857] hover:bg-[#065f46] text-white transition-colors shadow-sm flex items-center gap-1"
                                    title="Mark as Paid and grant 30-day access"
                                  >
                                    {actionLoadingId === student.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                                    ) : (
                                      <span>Mark as Paid</span>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleMarkUnpaid(student.id)}
                                    disabled={actionLoadingId === student.id}
                                    className="px-3.5 min-h-[44px] rounded-xl text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-1"
                                    title="Revoke active access and mark unpaid"
                                  >
                                    <span>Mark as Unpaid</span>
                                  </button>
                                )}

                                <button
                                  onClick={() =>
                                    handleDeleteStudent(
                                      student.id,
                                      student.email
                                    )
                                  }
                                  disabled={actionLoadingId === student.id}
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                                  title="Permanently delete account"
                                  aria-label="Delete student"
                                >
                                  <Trash2 className="w-4 h-4" />
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

        {/* TAB 2: LECTURES PUBLISHING & SEQUENCE */}
        {activeTab === "video" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Publish Form Panel */}
            <div className="lg:col-span-5 bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-black text-[#1E3A8A]">
                  Publish Video Lecture
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Upload a new recorded class to the syllabus
                </p>
              </div>

              <form onSubmit={handleCreateLecture} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#64748B] block mb-1">
                      Lecture Number
                    </label>
                    <input
                      type="number"
                      required
                      value={lectureForm.lecture_no}
                      onChange={(e) =>
                        setLectureForm({
                          ...lectureForm,
                          lecture_no: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#64748B] block mb-1">
                      Subject
                    </label>
                    <select
                      value={lectureForm.subject}
                      onChange={(e) =>
                        setLectureForm({
                          ...lectureForm,
                          subject: e.target.value,
                        })
                      }
                      className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                    >
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Higher Math">Higher Math</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">
                    Chapter Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. আলোর প্রতিফলন"
                    value={lectureForm.chapter}
                    onChange={(e) =>
                      setLectureForm({
                        ...lectureForm,
                        chapter: e.target.value,
                      })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">
                    Lecture Title / Topic
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lecture 01 - Basics"
                    value={lectureForm.title}
                    onChange={(e) =>
                      setLectureForm({
                        ...lectureForm,
                        title: e.target.value,
                        topic: e.target.value,
                      })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">
                    YouTube URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={lectureForm.video_url}
                    onChange={(e) =>
                      setLectureForm({
                        ...lectureForm,
                        video_url: e.target.value,
                      })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] bg-[#1E3A8A] hover:bg-[#1e40af] text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                >
                  Publish to Syllabus
                </button>
              </form>
            </div>

            {/* Sequence & Chapter Manager Panel */}
            <div className="lg:col-span-7 bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E1D8] pb-4">
                <div>
                  <h2 className="text-lg font-black text-[#1E3A8A] flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-[#0369A1]" />
                    <span>Sequence & Chapter Manager</span>
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Order lectures using Up/Down arrows or auto-renumber
                    sequentially
                  </p>
                </div>
                <button
                  onClick={fetchLectures}
                  className="text-xs font-bold text-[#1E3A8A] hover:text-[#0369A1] flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Filter controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAF8F5] p-3 rounded-xl border border-[#E6E1D8]">
                <div>
                  <label className="text-[10px] text-[#64748B] uppercase font-bold block mb-1">
                    Subject
                  </label>
                  <select
                    value={filterVideoSubject}
                    onChange={(e) => setFilterVideoSubject(e.target.value)}
                    className="w-full bg-white border border-[#E6E1D8] rounded-xl px-2.5 min-h-[44px] text-xs text-[#0F172A]"
                  >
                    <option value="ALL">All Subjects</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Higher Math">Higher Math</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#64748B] uppercase font-bold block mb-1">
                    Chapter
                  </label>
                  <select
                    value={filterVideoChapter}
                    onChange={(e) => setFilterVideoChapter(e.target.value)}
                    className="w-full bg-white border border-[#E6E1D8] rounded-xl px-2.5 min-h-[44px] text-xs text-[#0F172A]"
                  >
                    <option value="ALL">
                      All Chapters ({uniqueChapters.length})
                    </option>
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
                    className="w-full min-h-[44px] px-3 bg-[#EFF6FF] text-[#1E3A8A] border border-[#BFDBFE] hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                    title="Auto-renumber lectures in selected chapter 1, 2, 3..."
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#0369A1]" />
                    <span>Auto-Renumber (1..N)</span>
                  </button>
                </div>
              </div>

              {/* Lectures List */}
              {sortedAndFilteredLectures.length === 0 ? (
                <p className="text-xs text-[#64748B] py-10 text-center">
                  No video lectures found in this filter.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1 no-scrollbar">
                  {sortedAndFilteredLectures.map((lec, idx) => {
                    const isFirst = idx === 0;
                    const isLast =
                      idx === sortedAndFilteredLectures.length - 1;

                    return (
                      <div
                        key={lec.id}
                        className="bg-[#FAF8F5] border border-[#E6E1D8] hover:border-[#1E3A8A] rounded-2xl p-3.5 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() =>
                                handleSwapOrder(
                                  lec.id,
                                  sortedAndFilteredLectures[idx - 1].id
                                )
                              }
                              disabled={isFirst || reordering}
                              className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-white border border-[#E6E1D8] text-[#334155] hover:bg-[#1E3A8A] hover:text-white disabled:opacity-20 transition-colors"
                              title="Move Up"
                              aria-label="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                handleSwapOrder(
                                  lec.id,
                                  sortedAndFilteredLectures[idx + 1].id
                                )
                              }
                              disabled={isLast || reordering}
                              className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-white border border-[#E6E1D8] text-[#334155] hover:bg-[#1E3A8A] hover:text-white disabled:opacity-20 transition-colors"
                              title="Move Down"
                              aria-label="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1E3A8A] border border-[#BFDBFE]">
                                #{lec.lecture_no}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#E6E1D8] text-[#334155]">
                                {lec.subject}
                              </span>
                              {lec.is_published === false && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-[#0F172A] leading-tight">
                              {lec.title}
                            </h4>
                            <p className="text-[11px] text-[#64748B] mt-0.5">
                              {lec.chapter}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => setEditingLecture(lec)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white border border-[#E6E1D8] text-[#334155] hover:text-[#1E3A8A] transition-colors"
                            title="Edit details"
                            aria-label="Edit lecture"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleLecturePublish(lec.id)}
                            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-xs font-semibold border transition-colors ${lec.is_published === false
                                ? "bg-amber-50 border-amber-200 text-amber-800"
                                : "bg-white border-[#E6E1D8] text-[#334155] hover:text-[#0F172A]"
                              }`}
                            title={
                              lec.is_published === false ? "Publish" : "Unpublish"
                            }
                            aria-label="Toggle publish"
                          >
                            {lec.is_published === false ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>

                          <a
                            href={lec.video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white border border-[#E6E1D8] text-[#334155] hover:text-[#1E3A8A] transition-colors"
                            title="Watch video"
                            aria-label="Open YouTube Video"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <button
                            onClick={() => handleDeleteLecture(lec.id)}
                            disabled={actionLoadingId === lec.id}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                            title="Delete permanently"
                            aria-label="Delete lecture"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* TAB 3: STUDY MATERIALS & HANDOUTS */}
        {activeTab === "sheet" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sheet Upload Form Panel */}
            <div className="lg:col-span-5 bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-black text-[#1E3A8A]">
                  Upload Lecture Sheet
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Upload local PDF files or attach Google Drive documents
                </p>
              </div>

              <div className="flex bg-[#FAF8F5] p-1.5 rounded-2xl border border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={`flex-1 min-h-[44px] text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors ${uploadMode === "file"
                      ? "bg-[#1E3A8A] text-white shadow-sm"
                      : "text-[#64748B] hover:text-[#1E3A8A]"
                    }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload from PC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("link")}
                  className={`flex-1 min-h-[44px] text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors ${uploadMode === "link"
                      ? "bg-[#1E3A8A] text-white shadow-sm"
                      : "text-[#64748B] hover:text-[#1E3A8A]"
                    }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>Google Drive Link</span>
                </button>
              </div>

              <form onSubmit={handleSubmitSheet} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">
                    Subject
                  </label>
                  <select
                    value={sheetForm.subject}
                    onChange={(e) =>
                      setSheetForm({ ...sheetForm, subject: e.target.value })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Higher Math">Higher Math</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">
                    Chapter Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. আলোর প্রতিফলন"
                    value={sheetForm.chapter}
                    onChange={(e) =>
                      setSheetForm({ ...sheetForm, chapter: e.target.value })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">
                    Material Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CQ Solution Sheet 01"
                    value={sheetForm.title}
                    onChange={(e) =>
                      setSheetForm({ ...sheetForm, title: e.target.value })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>

                {uploadMode === "file" ? (
                  <div>
                    <label className="text-xs font-bold text-[#64748B] block mb-1">
                      Select PDF File
                    </label>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      required
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 py-2 text-xs text-[#0F172A] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1E3A8A] file:text-white hover:file:bg-[#1e40af] cursor-pointer min-h-[48px]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-[#64748B] block mb-1">
                      Document / Drive URL
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://drive.google.com/file/d/..."
                      value={sheetForm.file_url}
                      onChange={(e) =>
                        setSheetForm({
                          ...sheetForm,
                          file_url: e.target.value,
                        })
                      }
                      className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingSheet}
                  className="w-full min-h-[48px] bg-[#1E3A8A] hover:bg-[#1e40af] text-white rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center justify-center space-x-2"
                >
                  {submittingSheet ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading Document...</span>
                    </>
                  ) : (
                    <span>
                      {uploadMode === "file"
                        ? "Upload PDF File"
                        : "Save Drive Link"}
                    </span>
                  )}
                </button>
              </form>
            </div>

            {/* Sheets List Panel */}
            <div className="lg:col-span-7 bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-4">
                <h2 className="text-lg font-black text-[#1E3A8A]">
                  Uploaded Sheets ({materials.length})
                </h2>
                <button
                  onClick={fetchMaterials}
                  className="text-xs font-bold text-[#1E3A8A] hover:text-[#0369A1] flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {materials.length === 0 ? (
                <p className="text-xs text-[#64748B] py-10 text-center">
                  No PDF sheets uploaded yet.
                </p>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 no-scrollbar">
                  {materials.map((mat) => (
                    <div
                      key={mat.id}
                      className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1E3A8A] border border-[#BFDBFE]">
                            {mat.subject}
                          </span>
                          {mat.is_published === false && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              Hidden
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-[#0F172A]">
                          {mat.title}
                        </h4>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {mat.chapter}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setEditingMaterial(mat)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white border border-[#E6E1D8] text-[#334155] hover:text-[#1E3A8A] transition-colors"
                          title="Edit sheet details"
                          aria-label="Edit material"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleMaterialPublish(mat.id)}
                          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-xs font-semibold border transition-colors ${mat.is_published === false
                              ? "bg-amber-50 border-amber-200 text-amber-800"
                              : "bg-white border-[#E6E1D8] text-[#334155] hover:text-[#0F172A]"
                            }`}
                          title={
                            mat.is_published === false ? "Publish" : "Unpublish"
                          }
                          aria-label="Toggle publish material"
                        >
                          {mat.is_published === false ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        <a
                          href={mat.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white border border-[#E6E1D8] text-[#334155] hover:text-[#1E3A8A] transition-colors"
                          title="Open PDF"
                          aria-label="Open PDF Document"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => handleDeleteMaterial(mat.id)}
                          disabled={actionLoadingId === mat.id}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                          title="Delete permanently"
                          aria-label="Delete material"
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

      {/* EDIT LECTURE MODAL */}
      {editingLecture && (
        <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E1D8] rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4 text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
              <h3 className="text-base font-bold text-[#1E3A8A] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#0369A1]" />
                <span>Edit Video Lecture</span>
              </h3>
              <button
                onClick={() => setEditingLecture(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] rounded-xl hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLecture} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">
                    Lecture Number
                  </label>
                  <input
                    type="number"
                    required
                    value={editingLecture.lecture_no}
                    onChange={(e) =>
                      setEditingLecture({
                        ...editingLecture,
                        lecture_no: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">
                    Subject
                  </label>
                  <select
                    value={editingLecture.subject}
                    onChange={(e) =>
                      setEditingLecture({
                        ...editingLecture,
                        subject: e.target.value,
                      })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Higher Math">Higher Math</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Chapter
                </label>
                <input
                  type="text"
                  required
                  value={editingLecture.chapter}
                  onChange={(e) =>
                    setEditingLecture({
                      ...editingLecture,
                      chapter: e.target.value,
                    })
                  }
                  className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Topic / Title
                </label>
                <input
                  type="text"
                  required
                  value={editingLecture.title}
                  onChange={(e) =>
                    setEditingLecture({
                      ...editingLecture,
                      title: e.target.value,
                    })
                  }
                  className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  YouTube URL
                </label>
                <input
                  type="url"
                  required
                  value={editingLecture.video_url}
                  onChange={(e) =>
                    setEditingLecture({
                      ...editingLecture,
                      video_url: e.target.value,
                    })
                  }
                  className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLecture(null)}
                  className="px-4 min-h-[48px] rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-[#FAF8F5] border border-[#E6E1D8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 min-h-[48px] rounded-xl text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#1e40af] shadow-sm"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MATERIAL MODAL */}
      {editingMaterial && (
        <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E1D8] rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4 text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
              <h3 className="text-base font-bold text-[#1E3A8A] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#0369A1]" />
                <span>Edit Study Material Sheet</span>
              </h3>
              <button
                onClick={() => setEditingMaterial(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] rounded-xl hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMaterial} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Subject
                </label>
                <select
                  value={editingMaterial.subject}
                  onChange={(e) =>
                    setEditingMaterial({
                      ...editingMaterial,
                      subject: e.target.value,
                    })
                  }
                  className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Higher Math">Higher Math</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Chapter
                </label>
                <input
                  type="text"
                  required
                  value={editingMaterial.chapter}
                  onChange={(e) =>
                    setEditingMaterial({
                      ...editingMaterial,
                      chapter: e.target.value,
                    })
                  }
                  className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Material Title
                </label>
                <input
                  type="text"
                  required
                  value={editingMaterial.title}
                  onChange={(e) =>
                    setEditingMaterial({
                      ...editingMaterial,
                      title: e.target.value,
                    })
                  }
                  className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  PDF File / Google Drive URL
                </label>
                <input
                  type="url"
                  required
                  value={editingMaterial.file_url}
                  onChange={(e) =>
                    setEditingMaterial({
                      ...editingMaterial,
                      file_url: e.target.value,
                    })
                  }
                  className="w-full bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-3 min-h-[48px] text-sm text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 min-h-[48px] rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-[#FAF8F5] border border-[#E6E1D8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 min-h-[48px] rounded-xl text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#1e40af] shadow-sm"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNIFIED SITE FOOTER */}
      <SiteFooter />
    </div>
  );
}
