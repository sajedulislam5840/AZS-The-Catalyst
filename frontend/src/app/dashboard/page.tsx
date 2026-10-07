'use client';

import { useEffect, useState, FormEvent, useMemo, useRef } from 'react';
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

interface Notice {
    id: string;
    content: string;
    created_at: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
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
    const [notice, setNotice] = useState<Notice | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Student Gamification
    const [watchedVideos, setWatchedVideos] = useState<string[]>([]);
    const [streakDays, setStreakDays] = useState<number>(1);

    // Filters
    const [activeTab, setActiveTab] = useState<TabType>('VIDEOS');
    const [selectedSubject, setSelectedSubject] = useState<'ALL' | Subject>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Admin Broadcast State
    const [noticeText, setNoticeText] = useState('');
    const [broadcastingNotice, setBroadcastingNotice] = useState(false);

    // Admin Forms State
    const [mTitle, setMTitle] = useState('');
    const [mChapter, setMChapter] = useState('');
    const [mSubject, setMSubject] = useState<Subject>('PHYSICS');
    const [mFile, setMFile] = useState<File | null>(null);
    const [uploadingPdf, setUploadingPdf] = useState(false);

    const [vLectureNo, setVLectureNo] = useState<number | ''>('');
    const [vTopic, setVTopic] = useState('');
    const [vChapter, setVChapter] = useState('');
    const [vSubject, setVSubject] = useState<Subject>('PHYSICS');
    const [vUrl, setVUrl] = useState('');
    const [addingVideo, setAddingVideo] = useState(false);

    // Embedded AI Assistant State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'সালাম! আমি EduTrack AI Tutor & Guide। ফিজিক্স ও কেমিস্ট্রির যেকোনো কনসেপ্ট, অঙ্ক বা প্ল্যাটফর্মের ক্লাস খুঁজতে আমাকে প্রশ্ন করতে পারো!',
        },
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        const token = localStorage.getItem('token');
        const storedRole = localStorage.getItem('role') || 'STUDENT';

        if (!token) {
            router.push('/login');
            return;
        }

        setRole(storedRole);

        if (storedRole.toUpperCase() !== 'ADMIN') {
            const savedWatched = localStorage.getItem('edutrack_watched_videos');
            if (savedWatched) {
                try {
                    setWatchedVideos(JSON.parse(savedWatched));
                } catch {
                    setWatchedVideos([]);
                }
            }

            const lastActive = localStorage.getItem('edutrack_last_active');
            const savedStreak = parseInt(localStorage.getItem('edutrack_streak') || '1', 10);
            const today = new Date().toISOString().slice(0, 10);

            if (lastActive) {
                const diff = Math.floor(
                    (new Date(today).getTime() - new Date(lastActive).getTime()) / (1000 * 3600 * 24)
                );
                if (diff === 1) {
                    const next = savedStreak + 1;
                    setStreakDays(next);
                    localStorage.setItem('edutrack_streak', next.toString());
                } else if (diff > 1) {
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
        }

        fetchData();
    }, [router]);

    useEffect(() => {
        if (isChatOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isChatOpen]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [matRes, vidRes, notRes] = await Promise.all([
                api.get('/api/v1/academic/materials'),
                api.get('/api/v1/academic/videos'),
                api.get('/api/v1/academic/notice').catch(() => ({ data: null })),
            ]);
            setMaterials(matRes.data || []);
            setVideos(vidRes.data || []);
            setNotice(notRes.data || null);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBroadcastNotice = async (e: FormEvent) => {
        e.preventDefault();
        if (!noticeText.trim()) return;

        try {
            setBroadcastingNotice(true);
            const res = await api.post('/api/v1/academic/notice', { content: noticeText.trim() });
            setNotice(res.data);
            setNoticeText('');
            alert('Urgent notice broadcasted to all students!');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to broadcast notice');
        } finally {
            setBroadcastingNotice(false);
        }
    };

    const handleClearNotice = async () => {
        if (!confirm('Are you sure you want to clear the active notice banner?')) return;
        try {
            await api.delete('/api/v1/academic/notice');
            setNotice(null);
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to clear notice');
        }
    };

    const toggleWatchStatus = (id: string) => {
        const updated = watchedVideos.includes(id)
            ? watchedVideos.filter((vId) => vId !== id)
            : [...watchedVideos, id];
        setWatchedVideos(updated);
        localStorage.setItem('edutrack_watched_videos', JSON.stringify(updated));
    };

    const handleUploadMaterial = async (e: FormEvent) => {
        e.preventDefault();
        if (!mFile) {
            alert('Please select a PDF file');
            return;
        }

        const formData = new FormData();
        formData.append('title', mTitle);
        formData.append('chapter', mChapter);
        formData.append('subject', mSubject);
        formData.append('file', mFile);

        try {
            setUploadingPdf(true);
            await api.post('/api/v1/academic/materials/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setMTitle('');
            setMChapter('');
            setMFile(null);
            const fileInput = document.getElementById('admin-pdf-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            fetchData();
            alert('PDF published successfully!');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to upload PDF');
        } finally {
            setUploadingPdf(false);
        }
    };

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm('Are you sure you want to delete this sheet?')) return;
        try {
            await api.delete(`/api/v1/academic/materials/${id}`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete sheet');
        }
    };

    const handleAddVideo = async (e: FormEvent) => {
        e.preventDefault();
        if (!vLectureNo) return;

        try {
            setAddingVideo(true);
            await api.post('/api/v1/academic/videos', {
                lecture_no: Number(vLectureNo),
                topic: vTopic,
                chapter: vChapter,
                subject: vSubject,
                youtube_url: vUrl,
            });
            setVLectureNo('');
            setVTopic('');
            setVChapter('');
            setVUrl('');
            fetchData();
            alert('Video lecture added successfully!');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to add lecture');
        } finally {
            setAddingVideo(false);
        }
    };

    const handleDeleteVideo = async (id: string) => {
        if (!confirm('Are you sure you want to remove this lecture?')) return;
        try {
            await api.delete(`/api/v1/academic/videos/${id}`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete lecture');
        }
    };

    const handleSendChat = async (customPrompt?: string) => {
        const textToSend = (customPrompt || chatInput).trim();
        if (!textToSend || chatLoading) return;

        const newMsgs: ChatMessage[] = [...chatMessages, { role: 'user', content: textToSend }];
        setChatMessages(newMsgs);
        setChatInput('');
        setChatLoading(true);

        try {
            const res = await api.post('/api/v1/ai/chat', { prompt: textToSend });
            setChatMessages([...newMsgs, { role: 'assistant', content: res.data.reply }]);
        } catch {
            setChatMessages([
                ...newMsgs,
                {
                    role: 'assistant',
                    content: 'দুঃখিত, AI সার্ভিসটি এই মুহূর্তে ব্যস্ত আছে। একটু পর আবার চেষ্টা করো!',
                },
            ]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        router.push('/login');
    };

    // Student Progress Calculations
    const totalLectures = videos.length;
    const completedCount = useMemo(() => {
        return videos.filter((v) => watchedVideos.includes(v.id)).length;
    }, [videos, watchedVideos]);

    const completionPercentage = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

    const chapterAnalytics = useMemo(() => {
        const map: Record<string, { total: number; completed: number; subject: Subject }> = {};
        videos.forEach((v) => {
            if (!map[v.chapter]) map[v.chapter] = { total: 0, completed: 0, subject: v.subject };
            map[v.chapter].total += 1;
            if (watchedVideos.includes(v.id)) map[v.chapter].completed += 1;
        });
        return Object.entries(map);
    }, [videos, watchedVideos]);

    // Filters
    const filteredVideos = useMemo(() => {
        return videos.filter((v) => {
            const matchSubj = selectedSubject === 'ALL' || v.subject === selectedSubject;
            const matchSearch =
                v.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.chapter.toLowerCase().includes(searchQuery.toLowerCase());
            return matchSubj && matchSearch;
        });
    }, [videos, selectedSubject, searchQuery]);

    const filteredMaterials = useMemo(() => {
        return materials.filter((m) => {
            const matchSubj = selectedSubject === 'ALL' || m.subject === selectedSubject;
            const matchSearch =
                m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.chapter.toLowerCase().includes(searchQuery.toLowerCase());
            return matchSubj && matchSearch;
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
                                {isAdmin ? 'Instructor Hub' : 'Student Portal'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isAdmin && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                                <span>🔥</span>
                                <span>{streakDays} Day Streak</span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
                            <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-indigo-400' : 'bg-emerald-400'} animate-pulse`}></span>
                            <span className="font-semibold text-slate-300">{role.toUpperCase()}</span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Notice Banner */}
            {!isAdmin && notice && (
                <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase">
                            Notice
                        </span>
                        <p className="text-xs sm:text-sm text-amber-200 font-medium leading-tight flex-1">
                            {notice.content}
                        </p>
                    </div>
                </div>
            )}

            {/* Main Container */}
            <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-8">
                {isAdmin ? (
                    /* ================= ADMIN VIEW ================= */
                    <div className="space-y-8">
                        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                                <p className="text-xs text-slate-400 font-medium">Published Lectures</p>
                                <p className="text-2xl sm:text-3xl font-bold text-indigo-400 mt-1">{videos.length}</p>
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                                <p className="text-xs text-slate-400 font-medium">PDF Study Sheets</p>
                                <p className="text-2xl sm:text-3xl font-bold text-violet-400 mt-1">{materials.length}</p>
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                                <p className="text-xs text-slate-400 font-medium">Physics Content</p>
                                <p className="text-2xl sm:text-3xl font-bold text-sky-400 mt-1">
                                    {videos.filter((v) => v.subject === 'PHYSICS').length +
                                        materials.filter((m) => m.subject === 'PHYSICS').length}
                                </p>
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                                <p className="text-xs text-slate-400 font-medium">Chemistry Content</p>
                                <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">
                                    {videos.filter((v) => v.subject === 'CHEMISTRY').length +
                                        materials.filter((m) => m.subject === 'CHEMISTRY').length}
                                </p>
                            </div>
                        </section>

                        {/* Broadcast Notice Form */}
                        <section className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                                        <span>📢 Live Notice Broadcaster</span>
                                    </h2>
                                    <p className="text-xs text-slate-400">Instantly pins an alert banner to all student dashboards</p>
                                </div>
                                {notice && (
                                    <button
                                        onClick={handleClearNotice}
                                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 transition"
                                    >
                                        Clear Active Banner
                                    </button>
                                )}
                            </div>

                            {notice && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300">
                                    <span className="font-bold mr-1">Currently Live:</span> {notice.content}
                                </div>
                            )}

                            <form onSubmit={handleBroadcastNotice} className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="e.g. Tomorrow's Physics revision class will start at 8:30 PM sharp."
                                    required
                                    value={noticeText}
                                    onChange={(e) => setNoticeText(e.target.value)}
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                                />
                                <button
                                    type="submit"
                                    disabled={broadcastingNotice}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50 shrink-0"
                                >
                                    {broadcastingNotice ? 'Publishing...' : 'Broadcast Notice'}
                                </button>
                            </form>
                        </section>

                        {/* Publishing Forms */}
                        <section className="grid md:grid-cols-2 gap-6">
                            {/* PDF Form */}
                            <form onSubmit={handleUploadMaterial} className="space-y-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <h3 className="font-bold text-sm text-indigo-400">Upload PDF Sheet</h3>
                                    <span className="text-[10px] text-slate-500">Local PC</span>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1">Sheet Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Hydrostatics Problem Set"
                                            required
                                            value={mTitle}
                                            onChange={(e) => setMTitle(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1">Chapter Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Fluids Mechanics"
                                            required
                                            value={mChapter}
                                            onChange={(e) => setMChapter(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Subject</label>
                                            <select
                                                value={mSubject}
                                                onChange={(e) => setMSubject(e.target.value as Subject)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="PHYSICS">Physics</option>
                                                <option value="CHEMISTRY">Chemistry</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Select File</label>
                                            <input
                                                id="admin-pdf-input"
                                                type="file"
                                                accept="application/pdf"
                                                required
                                                onChange={(e) => setMFile(e.target.files?.[0] || null)}
                                                className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer border border-slate-800 rounded-xl p-1 bg-slate-950"
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
                            <form onSubmit={handleAddVideo} className="space-y-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <h3 className="font-bold text-sm text-indigo-400">Add YouTube Lecture</h3>
                                    <span className="text-[10px] text-slate-500">Live Recording</span>
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
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[11px] text-slate-400 block mb-1">Topic</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Wave Optics Class 01"
                                                required
                                                value={vTopic}
                                                onChange={(e) => setVTopic(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Subject</label>
                                            <select
                                                value={vSubject}
                                                onChange={(e) => setVSubject(e.target.value as Subject)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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
                        </section>

                        {/* Repositories Tables */}
                        <section className="space-y-6">
                            <h2 className="text-base font-bold text-white">Repository Manager</h2>

                            {/* Videos Table */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl overflow-x-auto">
                                <h3 className="text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider">
                                    Active Video Lectures ({videos.length})
                                </h3>
                                <table className="w-full text-left text-xs text-slate-300">
                                    <thead className="bg-slate-950/80 text-[11px] text-slate-500 border-b border-slate-800">
                                        <tr>
                                            <th className="py-2.5 px-3">Lec #</th>
                                            <th className="py-2.5 px-3">Topic</th>
                                            <th className="py-2.5 px-3">Chapter</th>
                                            <th className="py-2.5 px-3">Subject</th>
                                            <th className="py-2.5 px-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {videos.map((vid) => (
                                            <tr key={vid.id} className="hover:bg-slate-800/40">
                                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{vid.lecture_no}</td>
                                                <td className="py-2.5 px-3 font-medium text-slate-100">{vid.topic}</td>
                                                <td className="py-2.5 px-3 text-slate-400">{vid.chapter}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${vid.subject === 'PHYSICS' ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'
                                                        }`}>
                                                        {vid.subject}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-right">
                                                    <button
                                                        onClick={() => handleDeleteVideo(vid.id)}
                                                        className="text-[11px] text-rose-400 hover:text-rose-300 transition font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* PDF Materials Table */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl overflow-x-auto">
                                <h3 className="text-xs font-bold text-violet-400 mb-3 uppercase tracking-wider">
                                    Active Study Materials ({materials.length})
                                </h3>
                                <table className="w-full text-left text-xs text-slate-300">
                                    <thead className="bg-slate-950/80 text-[11px] text-slate-500 border-b border-slate-800">
                                        <tr>
                                            <th className="py-2.5 px-3">Title</th>
                                            <th className="py-2.5 px-3">Chapter</th>
                                            <th className="py-2.5 px-3">Subject</th>
                                            <th className="py-2.5 px-3">Link</th>
                                            <th className="py-2.5 px-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {materials.map((mat) => (
                                            <tr key={mat.id} className="hover:bg-slate-800/40">
                                                <td className="py-2.5 px-3 font-medium text-slate-100">{mat.title}</td>
                                                <td className="py-2.5 px-3 text-slate-400">{mat.chapter}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${mat.subject === 'PHYSICS' ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'
                                                        }`}>
                                                        {mat.subject}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <a
                                                        href={mat.pdf_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-400 hover:underline text-[11px]"
                                                    >
                                                        View PDF
                                                    </a>
                                                </td>
                                                <td className="py-2.5 px-3 text-right">
                                                    <button
                                                        onClick={() => handleDeleteMaterial(mat.id)}
                                                        className="text-[11px] text-rose-400 hover:text-rose-300 transition font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                ) : (
                    /* ================= STUDENT VIEW ================= */
                    <div className="space-y-8">
                        <section className="grid lg:grid-cols-3 gap-6">
                            {/* Mastery Bar */}
                            <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 flex flex-col justify-between shadow-xl">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                                            Personal Mastery
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {completedCount} of {totalLectures} Classes Complete
                                        </span>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                        {completionPercentage}% Syllabus Covered
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        Stay focused on regular revision and practice sheets.
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
                                        <span>0% Milestone</span>
                                        <span>50% Revision</span>
                                        <span>100% Exam Ready</span>
                                    </div>
                                </div>
                            </div>

                            {/* Chapter Breakdown */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-slate-100">Chapter Breakdown</h3>
                                    <p className="text-xs text-slate-500">Unit-by-unit syllabus progression.</p>
                                </div>

                                <div className="mt-4 space-y-3 overflow-y-auto max-h-48 pr-1">
                                    {chapterAnalytics.length === 0 ? (
                                        <p className="text-xs text-slate-600">No chapters found.</p>
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

                        {/* Filter Tabs */}
                        <section className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
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

                        {/* Videos Grid */}
                        {activeTab === 'VIDEOS' && (
                            <section>
                                {loading ? (
                                    <div className="py-20 text-center text-slate-500 text-xs animate-pulse">
                                        Loading lectures...
                                    </div>
                                ) : filteredVideos.length === 0 ? (
                                    <div className="py-20 text-center rounded-3xl border border-slate-800 bg-slate-900/30 text-slate-500 text-xs">
                                        No video lectures found.
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
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Materials Grid */}
                        {activeTab === 'MATERIALS' && (
                            <section>
                                {loading ? (
                                    <div className="py-20 text-center text-slate-500 text-xs animate-pulse">
                                        Loading study sheets...
                                    </div>
                                ) : filteredMaterials.length === 0 ? (
                                    <div className="py-20 text-center rounded-3xl border border-slate-800 bg-slate-900/30 text-slate-500 text-xs">
                                        No PDF sheets found.
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
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </main>

            {/* Embedded Floating AI Chat Assistant */}
            <div className="fixed bottom-6 right-6 z-50">
                {!isChatOpen && (
                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all text-xs font-bold"
                    >
                        <span className="text-base">✨</span>
                        <span>Ask EduTrack AI</span>
                    </button>
                )}

                {isChatOpen && (
                    <div className="w-[340px] sm:w-[380px] h-[520px] bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
                        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm shadow">
                                    ✨
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-white">EduTrack AI Tutor</h3>
                                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        Online • Guide & Solver
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="text-slate-400 hover:text-white text-sm font-bold p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => handleSendChat("Faraday's Law সহজ বাংলায় বুঝিয়ে দাও")}
                                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:text-indigo-300"
                            >
                                ⚡ Faraday's Law
                            </button>
                            <button
                                onClick={() => handleSendChat("প্ল্যাটফর্মে কোন কোন চ্যাপ্টারের ক্লাস আছে?")}
                                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:text-indigo-300"
                            >
                                📚 Class Guide
                            </button>
                            <button
                                onClick={() => handleSendChat("আর্কিমিডিসের সূত্র ও প্লবতার সমীকরণ ব্যাখ্যা কর")}
                                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:text-indigo-300"
                            >
                                🌊 Archimedes
                            </button>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                            {chatMessages.map((m, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${m.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-br-none'
                                                : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
                                            }`}
                                    >
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 border border-slate-700/60 text-slate-400 px-3.5 py-2 rounded-2xl text-[11px] animate-pulse">
                                        AI ভাবছে...
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendChat();
                            }}
                            className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2"
                        >
                            <input
                                type="text"
                                placeholder="Ask anything (Theory, Math, Guide)..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                            />
                            <button
                                type="submit"
                                disabled={chatLoading || !chatInput.trim()}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs transition"
                            >
                                ➤
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
                EduTrack Academic Studio • Physics & Chemistry Resource Hub
            </footer>
        </div>
    );
}