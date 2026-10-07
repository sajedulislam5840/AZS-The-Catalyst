'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Material {
  id: string;
  title: string;
  chapter: string;
  subject: 'PHYSICS' | 'CHEMISTRY';
  pdf_url: string;
  created_at: string;
}

interface VideoLecture {
  id: string;
  title: string;
  chapter: string;
  subject: 'PHYSICS' | 'CHEMISTRY';
  youtube_url: string;
  created_at: string;
}

// YouTube URL theke iframe embed link bananor helper
function getYouTubeEmbedUrl(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
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

  // Material Form State (Admin)
  const [mTitle, setMTitle] = useState('');
  const [mChapter, setMChapter] = useState('');
  const [mSubject, setMSubject] = useState<'PHYSICS' | 'CHEMISTRY'>('PHYSICS');
  const [mPdfUrl, setMPdfUrl] = useState('');

  // Video Form State (Admin)
  const [vTitle, setVTitle] = useState('');
  const [vChapter, setVChapter] = useState('');
  const [vSubject, setVSubject] = useState<'PHYSICS' | 'CHEMISTRY'>('PHYSICS');
  const [vUrl, setVUrl] = useState('');

  useEffect(() => {
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
      setMaterials(matRes.data);
      setVideos(vidRes.data);
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
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

  const handleAddVideo = async (e: React.FormEvent) => {
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
        {role.toUpperCase() === 'ADMIN' && (
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
                    onChange={(e: any) => setMSubject(e.target.value)}
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
                    onChange={(e: any) => setVSubject(e.target.value)}
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
                    <div className="p-4 flex-1 flex flex-col justify-between"></div>