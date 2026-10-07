'use client';

import { useEffect, useState, FormEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type Subject = 'PHYSICS' | 'CHEMISTRY';
type TabType = 'VIDEOS' | 'MATERIALS';

interface Material {
    id: string;
    title: string;
    chapter: string;
    subject: Subject;
    pdf_url: string;
    created_at: string;
}

interface VideoLecture {
    id: string;
    lecture_no: number;
    topic: string;
    chapter: string;
    subject: Subject;
    youtube_url: string;
    created_at: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=[\\&]?)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
        ? `https://www.youtube.com/embed/${match[2]}`
        : null;
}

export default function DashboardPage() {
    const router = useRouter();
    const [role, setRole] = useState<string>('');
    const [materials, setMaterials] = useState<Material[]>([]);
    const [videos, setVideos] = useState<VideoLecture[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Gamification & Progress State
    const [watchedVideos, setWatchedVideos] = useState<string[]>([]);
    const [streakDays, setStreakDays] = useState<number>(1);

    // Filters & Tabs
    const [activeTab, setActiveTab] = useState<TabType>('VIDEOS');
    const [selectedSubject, setSelectedSubject] = useState<'ALL' | Subject>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdminPanel, setShowAdminPanel] = useState(false);

    // Material Form State (Admin)
    const [mTitle, setMTitle] = useState('');
    const [mChapter, setMChapter] = useState('');
    const [mSubject, setMSubject] = useState<Subject>('PHYSICS');
    const [mFile, setMFile] = useState<File | null>(null);
    const [uploadingPdf, setUploadingPdf] = useState(false);

    // Video Form State (Admin)
    const [vLectureNo, setVLectureNo] = useState<number | ''>('');
    const [vTopic, setVTopic] = useState('');
    const [vChapter, setVChapter] = useState('');
    const [vSubject, setVSubject] = useState<Subject>('PHYSICS');
    const [vUrl, setVUrl] = useState('');
    const [addingVideo, setAddingVideo] = useState(false);

    useEffect(() => {
        setMounted(true);
        const token = localStorage.getItem('token');
        const storedRole = localStorage.getItem('role') || 'STUDENT';

        if (!token) {
            router.push('/login');
            return;
        }

        setRole(storedRole);

        // Load progress and streak data
        const savedWatched = localStorage.getItem('edutrack_watched_videos');
        if (savedWatched) {
            try {
                setWatchedVideos(JSON.parse(savedWatched));
            } catch (e) {
                setWatchedVideos([]);
            }
        }

        const lastActiveDate = localStorage.getItem('edutrack_last_active');
        const savedStreak = parseInt(localStorage.getItem('edutrack_streak') || '1', 10);
        const today = new Date().toISOString().slice(0, 10);

        if (lastActiveDate) {
            const diffDays = Math.floor(
                (new Date(today).getTime() - new Date(lastActiveDate).getTime()) / (1000 * 3600 * 24)
            );
            if (diffDays === 1) {
                const nextStreak = savedStreak + 1;
                setStreakDays(nextStreak);
                localStorage.setItem('edutrack_streak', nextStreak.toString());
            } else if (diffDays > 1) {
                setStreakDays(1);
                localStorage.setItem('edutrack_streak', '1');
            } else {
                setStreakDays(savedStreak);
            }
        } else {
            localStorage.setItem('edutrack_streak', '1');
            setStreakDays(1);
        }
        localStorage.setItem('edutrack_last_active', today);

        fetchData();
    }, [router]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [matRes, vidRes] = await Promise.all([
                api.get('/api/v1/academic/materials'),
                api.get('/api/v1/academic/videos'),
            ]);
            setMaterials(matRes.data || []);
            setVideos(vidRes.data || []);
        } catch (err) {
            console.error('Data fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleWatchStatus = (id: string) => {
        let updated: string[];
        if (watchedVideos.includes(id)) {
            updated = watchedVideos.filter((vId) => vId !== id);
        } else {
            updated = [...watchedVideos, id];
        }
        setWatchedVideos(updated);
        localStorage.setItem('edutrack_watched_videos', JSON.stringify(updated));
    };

    const handleUploadMaterial = async (e: FormEvent) => {
        e.preventDefault();
        if (!mFile) {
            alert('Please select a PDF file from your computer');
            return;
        }

        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('title', mTitle);
        formData.append('chapter', mChapter);
        formData.append('subject', mSubject);
        formData.append('file', mFile);

        try {
            setUploadingPdf(true);
            await api.post('/api/v1/academic/materials/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });
            setMTitle('');
            setMChapter('');
            setMFile(null);
            const fileInput = document.getElementById('pdf-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            fetchData();
            alert('PDF sheet uploaded successfully!');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to upload PDF');
        } finally {
            setUploadingPdf(false);
        }
    };

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm('Are you sure you want to delete this sheet?')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/api/v1/academic/materials/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete PDF');
        }
    };

    const handleAddVideo = async (e: FormEvent) => {
        e.preventDefault();
        if (!vLectureNo) {
            alert('Please enter lecture number');
            return;
        }

        try {
            setAddingVideo(true);
            const token = localStorage.getItem('token');
            await api.post(
                '/api/v1/academic/videos',
                {
                    lecture_no: Number(vLectureNo),
                    topic: vTopic,
                    chapter: vChapter,
                    subject: vSubject,
                    youtube_url: vUrl,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setVLectureNo('');
            setVTopic('');
            setVChapter('');
            setVUrl('');
            fetchData();
            alert('Video lecture published successfully!');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to add video lecture');
        } finally {
            setAddingVideo(false);
        }
    };

    const handleDeleteVideo = async (id: string) => {
        if (!confirm('Are you sure you want to delete this lecture?')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/api/v1/academic/videos/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete video');
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        router.push('/login');
    };

    // Calculations for Progress & Analytics
    const totalLectures = videos.length;
    const completedCount = useMemo(() => {
        return videos.filter((v) => watchedVideos.includes(v.id)).length;
    }, [videos, watchedVideos]);

    const completionPercentage = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

    const chapterAnalytics = useMemo(() => {
        const map: Record<string, { total: number; completed: number; subject: Subject }> = {};
        videos.forEach((v) => {
            if (!map[v.chapter]) {
                map[v.chapter] = { total: 0, completed: 0, subject: v.subject };
            }
            map[v.chapter].total += 1;
            if (watchedVideos.includes(v.id)) {
                map[v.chapter].completed += 1;
            }
        });
        return Object.entries(map);
    }, [videos, watchedVideos]);

    // Filtered views
    const filteredVideos = useMemo(() => {
        return videos.filter((v) => {
            const matchesSubject = selectedSubject === 'ALL' || v.subject === selectedSubject;
            const matchesSearch =
                v.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.chapter.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSubject && matchesSearch;
        });
    }, [videos, selectedSubject, searchQuery]);

    const filteredMaterials = useMemo(() => {
        return materials.filter((m) => {
            const matchesSubject = selectedSubject === 'ALL' || m.subject === selectedSubject;
            const matchesSearch =
                m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.chapter.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSubject && matchesSearch;
        });
    }, [materials, selectedSubject, searchQuery]);

    if (!mounted) return null;
    const isAdmin = role.toUpperCase() === 'ADMIN';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
            {/* Top Navbar */}
            <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/20">
                            E
                        </div>
                        <div>
                            <span className="text-lg font-bold tracking-tight text-white">EduTrack</span>
                            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                Studio Portal
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Daily Streak Indicator */}
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                            <span>🔥</span>
                            <span>{streakDays} Day Streak</span>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="font-semibold text-slate-300">{role.toUpperCase()}</span>
                        </div>

                        {isAdmin && (
                            <button
                                onClick={() => setShowAdminPanel(!showAdminPanel)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${showAdminPanel
                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                {showAdminPanel ? 'Close Studio' : 'Admin Studio'}
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main App Container */}
            <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-8">
                {/* Progress & Chapter Analytics Hub */}
                <section className="grid lg:grid-cols-3 gap-6">
                    {/* Main Progress Meter */}
                    <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 flex flex-col justify-between shadow-xl">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                                    Academic Progress
                                </span>
                                <span className="text-xs text-slate-400">
                                    {completedCount} of {totalLectures} Classes Complete
                                </span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                {completionPercentage}% Course Mastered
                            </h2>
                            <p className="text-xs text-slate-400">
                                Keep up the daily momentum. Consistency in Physics and Chemistry builds top-rank readiness.
                            </p>
                        </div>

                        <div className="mt-6 space-y-2">
                            <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-500"
                                    style={{ width: `${completionPercentage}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                                <span>0% Started</span>
                                <span>50% Midterm Target</span>
                                <span>100% Complete</span>
                            </div>
                        </div>
                    </div>

                    {/* Chapterwise Completion Tracker */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-100">Chapter Breakdown</h3>
                                <span className="text-[10px] text-slate-400 font-mono">LIVE TRACK</span>
                            </div>
                            <p className="text-xs text-slate-500">Your unit-by-unit syllabus completion.</p>
                        </div>

                        <div className="mt-4 space-y-3 overflow-y-auto max-h-48 pr-1">
                            {chapterAnalytics.length === 0 ? (
                                <p className="text-xs text-slate-600">No chapters recorded yet.</p>
                            ) : (
                                chapterAnalytics.map(([chapter, stat]) => {
                                    const chPercent = Math.round((stat.completed / stat.total) * 100);
                                    return (
                                        <div key={chapter} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-300 font-medium truncate max-w-[160px]">
                                                    {chapter}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    {stat.completed}/{stat.total} ({chPercent}%)
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${stat.subject === 'PHYSICS' ? 'bg-sky-400' : 'bg-emerald-400'
                                                        }`}
                                                    style={{ width: `${chPercent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </section>

                {/* Admin Studio Drawer */}
                {isAdmin && showAdminPanel && (
                    <section className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h2 className="text-base font-bold text-white">Management Studio</h2>
                                <p className="text-xs text-slate-400">Publish study materials and recorded classes</p>
                            </div>
                            <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded border border-indigo-500/20">
                                ADMIN WORKSPACE
                            </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* PDF Form */}
                            <form onSubmit={handleUploadMaterial} className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-indigo-400">Upload PDF Sheet</h3>
                                    <span className="text-[11px] text-slate-500">From Local PC</span>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1">Sheet Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Archimedes Formula & MCQ Bank"
                                            required
                                            value={mTitle}
                                            onChange={(e) => setMTitle(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1">Chapter Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Fluids & Buoyancy"
                                            required
                                            value={mChapter}
                                            onChange={(e) => setMChapter(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Subject</label>
                                            <select
                                                value={mSubject}
                                                onChange={(e) => setMSubject(e.target.value as Subject)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="PHYSICS">Physics</option>
                                                <option value="CHEMISTRY">Chemistry</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Select File</label>
                                            <input
                                                id="pdf-file-input"
                                                type="file"
                                                accept="application/pdf"
                                                required
                                                onChange={(e) => setMFile(e.target.files?.[0] || null)}
                                                className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer border border-slate-800 rounded-xl p-1 bg-slate-900"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={uploadingPdf}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                                >
                                    {uploadingPdf ? 'Uploading...' : 'Publish PDF Material'}
                                </button>
                            </form>

                            {/* Video Form */}
                            <form onSubmit={handleAddVideo} className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-indigo-400">Add YouTube Lecture</h3>
                                    <span className="text-[11px] text-slate-500">Live Recording</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Lec No</label>
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="1"
                                                required
                                                value={vLectureNo}
                                                onChange={(e) => setVLectureNo(e.target.value === '' ? '' : parseInt(e.target.value))}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[11px] text-slate-400 block mb-1">Topic</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Wave Mechanics Class 01"
                                                required
                                                value={vTopic}
                                                onChange={(e) => setVTopic(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Chapter Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Wave Optics"
                                                required
                                                value={vChapter}
                                                onChange={(e) => setVChapter(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Subject</label>
                                            <select
                                                value={vSubject}
                                                onChange={(e) => setVSubject(e.target.value as Subject)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="PHYSICS">Physics</option>
                                                <option value="CHEMISTRY">Chemistry</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1">YouTube Link</label>
                                        <input
                                            type="url"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            required
                                            value={vUrl}
                                            onChange={(e) => setVUrl(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={addingVideo}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                                >
                                    {addingVideo ? 'Publishing...' : 'Publish Video Lecture'}
                                </button>
                            </form>
                        </div>
                    </section>
                )}

                {/* Global Navigation & Filtering Bar */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        {/* Main Content Tabs */}
                        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-2xl">
                            <button
                                onClick={() => setActiveTab('VIDEOS')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${activeTab === 'VIDEOS'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                <span>Video Lectures</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-950/60 rounded-full font-bold">
                                    {videos.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('MATERIALS')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${activeTab === 'MATERIALS'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                <span>Study Materials (PDF)</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-950/60 rounded-full font-bold">
                                    {materials.length}
                                </span>
                            </button>
                        </div>

                        {/* Subject Selector & Search Box */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                            <input
                                type="text"
                                placeholder="Search topic or chapter..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full sm:w-56 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />

                            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                                {(['ALL', 'PHYSICS', 'CHEMISTRY'] as const).map((subj) => (
                                    <button
                                        key={subj}
                                        onClick={() => setSelectedSubject(subj)}
                                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${selectedSubject === subj
                                                ? 'bg-slate-800 text-white shadow'
                                                : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                    >
                                        {subj === 'ALL' ? 'All' : subj === 'PHYSICS' ? 'Physics' : 'Chemistry'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Tab 1: Video Showcase */}
                {activeTab === 'VIDEOS' && (
                    <section>
                        {loading ? (
                            <div className="py-20 text-center text-slate-500 text-xs animate-pulse">
                                Loading video curriculum...
                            </div>
                        ) : filteredVideos.length === 0 ? (
                            <div className="py-20 text-center rounded-3xl border border-slate-800 bg-slate-900/30 text-slate-500 text-xs">
                                No video lectures found matching your criteria.
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredVideos.map((vid) => {
                                    const embedUrl = getYouTubeEmbedUrl(vid.youtube_url);
                                    const isWatched = watchedVideos.includes(vid.id);

                                    return (
                                        <div
                                            key={vid.id}
                                            className={`group bg-slate-900/60 hover:bg-slate-900 border rounded-3xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col justify-between ${isWatched
                                                    ? 'border-emerald-500/30 shadow-emerald-500/5'
                                                    : 'border-slate-800 hover:border-indigo-500/40'
                                                }`}
                                        >
                                            <div>
                                                {/* Video Frame */}
                                                <div className="aspect-video w-full bg-slate-950 relative overflow-hidden">
                                                    {embedUrl ? (
                                                        <iframe
                                                            src={embedUrl}
                                                            title={vid.topic}
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                            className="w-full h-full border-none"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-xs text-rose-400">
                                                            Invalid Video Link
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Details */}
                                                <div className="p-5 space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                            Lecture {vid.lecture_no}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${vid.subject === 'PHYSICS'
                                                                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                }`}
                                                        >
                                                            {vid.subject}
                                                        </span>
                                                    </div>

                                                    <h3 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
                                                        {vid.topic}
                                                    </h3>

                                                    <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                                        <span>{vid.chapter}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Card Footer Actions */}
                                            <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
                                                <button
                                                    onClick={() => toggleWatchStatus(vid.id)}
                                                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${isWatched
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                                                        }`}
                                                >
                                                    <span>{isWatched ? '✓ Done' : '○ Mark as Watched'}</span>
                                                </button>

                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleDeleteVideo(vid.id)}
                                                        className="text-xs text-rose-400 hover:text-rose-300 font-medium transition"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                {/* Tab 2: Materials Showcase */}
                {activeTab === 'MATERIALS' && (
                    <section>
                        {loading ? (
                            <div className="py-20 text-center text-slate-500 text-xs animate-pulse">
                                Loading study sheets...
                            </div>
                        ) : filteredMaterials.length === 0 ? (
                            <div className="py-20 text-center rounded-3xl border border-slate-800 bg-slate-900/30 text-slate-500 text-xs">
                                No PDF materials found matching your search.
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredMaterials.map((mat) => (
                                    <div
                                        key={mat.id}
                                        className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-5 shadow-xl transition-all duration-300 flex flex-col justify-between"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${mat.subject === 'PHYSICS'
                                                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        }`}
                                                >
                                                    {mat.subject}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-medium">{mat.chapter}</span>
                                            </div>

                                            <div className="flex items-start gap-3 pt-2">
                                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 font-bold text-xs">
                                                    PDF
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors leading-snug">
                                                        {mat.title}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-3.5 border-t border-slate-800 flex items-center justify-between">
                                            <a
                                                href={mat.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition"
                                            >
                                                <span>Open & Download</span>
                                                <span>→</span>
                                            </a>

                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDeleteMaterial(mat.id)}
                                                    className="text-xs text-rose-400 hover:text-rose-300 font-medium transition"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
                EduTrack Academic Portal • Physics & Chemistry Resource Hub
            </footer>
        </div>
    );
}