'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type Subject = 'PHYSICS' | 'CHEMISTRY';

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
    title: string;
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

    // Material Form State (Admin)
    const [mTitle, setMTitle] = useState('');
    const [mChapter, setMChapter] = useState('');
    const [mSubject, setMSubject] = useState<Subject>('PHYSICS');
    const [mPdfUrl, setMPdfUrl] = useState('');

    // Video Form State (Admin)
    const [vTitle, setVTitle] = useState('');
    const [vChapter, setVChapter] = useState('');
    const [vSubject, setVSubject] = useState<Subject>('PHYSICS');
    const [vUrl, setVUrl] = useState('');

    useEffect(() => {
        setMounted(true);
        const token = localStorage.getItem('token');
        const storedRole = localStorage.getItem('role') || 'STUDENT';

        if (!token) {
            router.push('/login');
            return;
        }

        setRole(storedRole);
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

    const handleAddMaterial = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/v1/academic/materials', {
                title: mTitle,
                chapter: mChapter,
                subject: mSubject,
                pdf_url: mPdfUrl,
            });
            setMTitle('');
            setMChapter('');
            setMPdfUrl('');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to add PDF');
        }
    };

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm('Are you sure you want to delete this sheet?')) return;
        try {
            await api.delete(`/api/v1/academic/materials/${id}`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete PDF');
        }
    };

    const handleAddVideo = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/v1/academic/videos', {
                title: vTitle,
                chapter: vChapter,
                subject: vSubject,
                youtube_url: vUrl,
            });
            setVTitle('');
            setVChapter('');
            setVUrl('');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to add video');
        }
    };

    const handleDeleteVideo = async (id: string) => {
        if (!confirm('Are you sure you want to delete this video?')) return;
        try {
            await api.delete(`/api/v1/academic/videos/${id}`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete video');
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        router.push('/login');
    };

    if (!mounted) {
        return null;
    }

    const isAdmin = role.toUpperCase() === 'ADMIN';

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
            {/* Navbar */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-bold tracking-tight text-indigo-600">EduTrack</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700">
                            {role.toUpperCase()}
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-sm font-medium text-red-600 hover:text-red-700 transition"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 mt-8 space-y-10">
                {/* Admin Management Section */}
                {isAdmin && (
                    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
                        <h2 className="text-lg font-bold text-gray-800">Admin Control Panel</h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* PDF Form */}
                            <form onSubmit={handleAddMaterial} className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h3 className="font-semibold text-sm text-indigo-600">Upload PDF Lecture Sheet</h3>
                                <input
                                    type="text"
                                    placeholder="Sheet Title (e.g. Archimedes Formula Sheet)"
                                    required
                                    value={mTitle}
                                    onChange={(e) => setMTitle(e.target.value)}
                                    className="w-full text-sm rounded border border-gray-300 p-2"
                                />
                                <input
                                    type="text"
                                    placeholder="Chapter (e.g. Wave Mechanics)"
                                    required
                                    value={mChapter}
                                    onChange={(e) => setMChapter(e.target.value)}
                                    className="w-full text-sm rounded border border-gray-300 p-2"
                                />
                                <div className="flex gap-2">
                                    <select
                                        value={mSubject}
                                        onChange={(e) => setMSubject(e.target.value as Subject)}
                                        className="text-sm rounded border border-gray-300 p-2 bg-white"
                                    >
                                        <option value="PHYSICS">Physics</option>
                                        <option value="CHEMISTRY">Chemistry</option>
                                    </select>
                                    <input
                                        type="url"
                                        placeholder="PDF / Drive URL"
                                        required
                                        value={mPdfUrl}
                                        onChange={(e) => setMPdfUrl(e.target.value)}
                                        className="w-full text-sm rounded border border-gray-300 p-2"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-indigo-600 text-white text-xs font-semibold py-2 rounded hover:bg-indigo-500"
                                >
                                    + Add PDF Sheet
                                </button>
                            </form>

                            {/* Video Form */}
                            <form onSubmit={handleAddVideo} className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h3 className="font-semibold text-sm text-indigo-600">Add YouTube Class Lecture</h3>
                                <input
                                    type="text"
                                    placeholder="Lecture Title (e.g. Organic Chemistry Class 01)"
                                    required
                                    value={vTitle}
                                    onChange={(e) => setVTitle(e.target.value)}
                                    className="w-full text-sm rounded border border-gray-300 p-2"
                                />
                                <input
                                    type="text"
                                    placeholder="Chapter (e.g. Aldehydes & Ketones)"
                                    required
                                    value={vChapter}
                                    onChange={(e) => setVChapter(e.target.value)}
                                    className="w-full text-sm rounded border border-gray-300 p-2"
                                />
                                <div className="flex gap-2">
                                    <select
                                        value={vSubject}
                                        onChange={(e) => setVSubject(e.target.value as Subject)}
                                        className="text-sm rounded border border-gray-300 p-2 bg-white"
                                    >
                                        <option value="PHYSICS">Physics</option>
                                        <option value="CHEMISTRY">Chemistry</option>
                                    </select>
                                    <input
                                        type="url"
                                        placeholder="YouTube Video Link"
                                        required
                                        value={vUrl}
                                        onChange={(e) => setVUrl(e.target.value)}
                                        className="w-full text-sm rounded border border-gray-300 p-2"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-indigo-600 text-white text-xs font-semibold py-2 rounded hover:bg-indigo-500"
                                >
                                    + Add YouTube Video
                                </button>
                            </form>
                        </div>
                    </section>
                )}

                {/* Video Lectures Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight">Recorded Video Lectures</h2>
                    {loading ? (
                        <p className="text-sm text-gray-500">Loading videos...</p>
                    ) : videos.length === 0 ? (
                        <p className="text-sm text-gray-400">No video lectures added yet.</p>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {videos.map((vid) => {
                                const embedUrl = getYouTubeEmbedUrl(vid.youtube_url);
                                return (
                                    <div key={vid.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                                        <div className="aspect-video w-full bg-black">
                                            {embedUrl ? (
                                                <iframe
                                                    src={embedUrl}
                                                    title={vid.title}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    className="w-full h-full border-none"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-xs text-red-400">
                                                    Invalid YouTube Link
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${vid.subject === 'PHYSICS' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                        {vid.subject}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500">{vid.chapter}</span>
                                                </div>
                                                <h3 className="font-semibold text-sm mt-2 line-clamp-1">{vid.title}</h3>
                                            </div>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDeleteVideo(vid.id)}
                                                    className="mt-3 text-xs text-red-500 hover:text-red-700 self-end font-medium"
                                                >
                                                    Remove Video
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* PDF Sheets Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight">Lecture Sheets & Study Materials (PDF)</h2>
                    {loading ? (
                        <p className="text-sm text-gray-500">Loading materials...</p>
                    ) : materials.length === 0 ? (
                        <p className="text-sm text-gray-400">No lecture sheets available.</p>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {materials.map((mat) => (
                                <div key={mat.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${mat.subject === 'PHYSICS' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {mat.subject}
                                            </span>
                                            <span className="text-[11px] text-gray-500">{mat.chapter}</span>
                                        </div>
                                        <h3 className="font-semibold text-sm mt-2">{mat.title}</h3>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between pt-2 border-t border-gray-100">
                                        <a
                                            href={mat.pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                        >
                                            View / Download PDF →
                                        </a>
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDeleteMaterial(mat.id)}
                                                className="text-xs text-red-500 hover:text-red-700 font-medium"
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
            </main>
        </div>
    );
}