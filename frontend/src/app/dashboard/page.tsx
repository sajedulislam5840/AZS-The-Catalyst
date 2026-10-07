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

    // Material Form State (Upload from PC)
    const [mTitle, setMTitle] = useState('');
    const [mChapter, setMChapter] = useState('');
    const [mSubject, setMSubject] = useState<Subject>('PHYSICS');
    const [mFile, setMFile] = useState<File | null>(null);
    const [uploadingPdf, setUploadingPdf] = useState(false);

    // Video Form State (Lecture No, Topic, Chapter, URL)
    const [vLectureNo, setVLectureNo] = useState<number | ''>('');
    const [vTopic, setVTopic] = useState('');
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

    const handleUploadMaterial = async (e: FormEvent) => {
        e.preventDefault();
        if (!mFile) {
            alert('Please select a PDF file from your device');
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
            const fileInput = document.getElementById('pdf-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            fetchData();
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
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to add video lecture');
        }
    };

    const handleDeleteVideo = async (id: string) => {
        if (!confirm('Are you sure you want to delete this video lecture?')) return;
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

    if (!mounted) return null;
    const isAdmin = role.toUpperCase() === 'ADMIN';

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
            {/* Top Navbar */}
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
                {/* Admin Control Panel */}
                {isAdmin && (
                    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
                        <h2 className="text-lg font-bold text-gray-800">Admin Control Panel</h2>
                        <div className="grid md:grid-cols-2 gap-8">

                            {/* PDF Local PC Upload Form */}
                            <form onSubmit={handleUploadMaterial} className="space-y-3 bg-gray-50 p-5 rounded-lg border border-gray-100 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm text-indigo-600">Upload PDF Sheet (From PC)</h3>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Sheet Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Archimedes Principle Practice Sheet"
                                            required
                                            value={mTitle}
                                            onChange={(e) => setMTitle(e.target.value)}
                                            className="w-full text-sm rounded border border-gray-300 p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Chapter Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Fluids & Hydrostatics"
                                            required
                                            value={mChapter}
                                            onChange={(e) => setMChapter(e.target.value)}
                                            className="w-full text-sm rounded border border-gray-300 p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                                            <select
                                                value={mSubject}
                                                onChange={(e) => setMSubject(e.target.value as Subject)}
                                                className="w-full text-sm rounded border border-gray-300 p-2 bg-white outline-none"
                                            >
                                                <option value="PHYSICS">Physics</option>
                                                <option value="CHEMISTRY">Chemistry</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Choose PDF File</label>
                                            <input
                                                id="pdf-file-input"
                                                type="file"
                                                accept="application/pdf"
                                                required
                                                onChange={(e) => setMFile(e.target.files?.[0] || null)}
                                                className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-gray-200 rounded p-1 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={uploadingPdf}
                                    className="w-full mt-2 bg-indigo-600 text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-indigo-500 transition disabled:opacity-50"
                                >
                                    {uploadingPdf ? 'Uploading...' : '+ Upload PDF to Platform'}
                                </button>
                            </form>

                            {/* Video Upload Form with Lecture No, Topic & Chapter */}
                            <form onSubmit={handleAddVideo} className="space-y-3 bg-gray-50 p-5 rounded-lg border border-gray-100">
                                <h3 className="font-semibold text-sm text-indigo-600">Add YouTube Class Lecture</h3>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Lecture No</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="e.g. 1"
                                            required
                                            value={vLectureNo}
                                            onChange={(e) => setVLectureNo(e.target.value === '' ? '' : parseInt(e.target.value))}
                                            className="w-full text-sm rounded border border-gray-300 p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Lecture Topic</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Faraday's Law & Induction"
                                            required
                                            value={vTopic}
                                            onChange={(e) => setVTopic(e.target.value)}
                                            className="w-full text-sm rounded border border-gray-300 p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Chapter Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Electromagnetic Induction"
                                            required
                                            value={vChapter}
                                            onChange={(e) => setVChapter(e.target.value)}
                                            className="w-full text-sm rounded border border-gray-300 p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                                        <select
                                            value={vSubject}
                                            onChange={(e) => setVSubject(e.target.value as Subject)}
                                            className="w-full text-sm rounded border border-gray-300 p-2 bg-white outline-none"
                                        >
                                            <option value="PHYSICS">Physics</option>
                                            <option value="CHEMISTRY">Chemistry</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">YouTube Video Link</label>
                                    <input
                                        type="url"
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        required
                                        value={vUrl}
                                        onChange={(e) => setVUrl(e.target.value)}
                                        className="w-full text-sm rounded border border-gray-300 p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full mt-2 bg-indigo-600 text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-indigo-500 transition"
                                >
                                    + Add Video Lecture
                                </button>
                            </form>

                        </div>
                    </section>
                )}

                {/* Video Lectures Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Recorded Video Lectures</h2>
                        <span className="text-xs text-gray-500 font-medium">{videos.length} Lectures Available</span>
                    </div>

                    {loading ? (
                        <p className="text-sm text-gray-500">Loading lectures...</p>
                    ) : videos.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-400 text-sm">
                            No video lectures published yet.
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {videos.map((vid) => {
                                const embedUrl = getYouTubeEmbedUrl(vid.youtube_url);
                                return (
                                    <div key={vid.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                                        <div>
                                            {/* YouTube Player */}
                                            <div className="aspect-video w-full bg-black">
                                                {embedUrl ? (
                                                    <iframe
                                                        src={embedUrl}
                                                        title={vid.topic}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                        className="w-full h-full border-none"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-xs text-red-400">
                                                        Invalid Video Link
                                                    </div>
                                                )}
                                            </div>

                                            {/* Video Info */}
                                            <div className="p-4 space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                                        Lecture {vid.lecture_no}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${vid.subject === 'PHYSICS' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                        {vid.subject}
                                                    </span>
                                                </div>
                                                <h3 className="font-semibold text-base text-gray-900 pt-1 leading-snug">{vid.topic}</h3>
                                                <p className="text-xs text-gray-500 font-medium">Chapter: {vid.chapter}</p>
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <div className="px-4 pb-4 pt-1 border-t border-gray-100 flex justify-end">
                                                <button
                                                    onClick={() => handleDeleteVideo(vid.id)}
                                                    className="text-xs text-red-500 hover:text-red-700 font-semibold transition"
                                                >
                                                    Remove Video
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* PDF Lecture Sheets Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Lecture Sheets & Study Materials (PDF)</h2>
                        <span className="text-xs text-gray-500 font-medium">{materials.length} Sheets Available</span>
                    </div>

                    {loading ? (
                        <p className="text-sm text-gray-500">Loading sheets...</p>
                    ) : materials.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-400 text-sm">
                            No lecture sheets available yet.
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {materials.map((mat) => (
                                <div key={mat.id} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${mat.subject === 'PHYSICS' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {mat.subject}
                                            </span>
                                            <span className="text-[11px] text-gray-500 font-medium">{mat.chapter}</span>
                                        </div>
                                        <h3 className="font-semibold text-sm text-gray-900 leading-snug">{mat.title}</h3>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
                                        <a
                                            href={mat.pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                        >
                                            <span>Download / Open PDF</span>
                                            <span>→</span>
                                        </a>
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDeleteMaterial(mat.id)}
                                                className="text-xs text-red-500 hover:text-red-700 font-medium transition"
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