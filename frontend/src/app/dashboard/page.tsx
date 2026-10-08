"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
    Sparkles,
    Send,
    X,
    Loader2,
    MessageSquare,
    BookOpen,
    Video,
    FileText,
    LogOut,
    PlayCircle,
    Download,
    ExternalLink,
    ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface VideoLectureItem {
    id: number;
    lecture_no: number;
    title: string;
    topic: string;
    chapter: string;
    subject: string;
    video_url: string;
}

interface MaterialItem {
    id: number;
    title: string;
    chapter: string;
    subject: string;
    file_url: string;
}

export default function DashboardPage() {
    const router = useRouter();

    // Tab State: "overview" | "videos" | "sheets"
    const [activeTab, setActiveTab] = useState<string>("overview");

    // Data states
    const [videos, setVideos] = useState<VideoLectureItem[]>([]);
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<VideoLectureItem | null>(null);

    // Chatbot State
    const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "সালাম! আমি EduTrack AI Academic Tutor & Guide। ফিজিক্স, কেমিস্ট্রি বা হায়ার ম্যাথের যেকোনো সূত্র, প্রমাণ বা কনসেপ্ট বুঝতে সরাসরি প্রশ্ন করতে পারো।",
        },
    ]);
    const [input, setInput] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Auto scroll chat
    useEffect(() => {
        if (isChatOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading, isChatOpen]);

    // Fetch lectures and materials from Backend
    useEffect(() => {
        const fetchData = async () => {
            const backendUrl =
                process.env.NEXT_PUBLIC_API_URL || "https://edutrack-backend.onrender.com";
            const token =
                typeof window !== "undefined" ? localStorage.getItem("token") : null;

            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            try {
                const [vRes, mRes] = await Promise.all([
                    fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/academic/lectures`, { headers }),
                    fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/academic/materials`, { headers }),
                ]);

                if (vRes.ok) {
                    const vData = await vRes.json();
                    setVideos(Array.isArray(vData) ? vData : []);
                }
                if (mRes.ok) {
                    const mData = await mRes.json();
                    setMaterials(Array.isArray(mData) ? mData : []);
                }
            } catch (err) {
                console.error("Failed to load academic data:", err);
            }
        };

        fetchData();
    }, []);

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("token");
        }
        router.push("/login");
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const promptText = input.trim();
        if (!promptText || isLoading) return;

        const userMessage: Message = { role: "user", content: promptText };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const historyPayload = messages
                .filter((_, idx) => idx !== 0)
                .slice(-6)
                .map((m) => ({ role: m.role, content: m.content }));

            const backendUrl =
                process.env.NEXT_PUBLIC_API_URL || "https://edutrack-backend.onrender.com";
            const token =
                typeof window !== "undefined" ? localStorage.getItem("token") : null;

            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/ai/chat`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    prompt: promptText,
                    history: historyPayload,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                const detailMsg =
                    errorData && errorData.detail
                        ? typeof errorData.detail === "string"
                            ? errorData.detail
                            : JSON.stringify(errorData.detail)
                        : `HTTP Error ${res.status}`;
                throw new Error(detailMsg);
            }

            const data = await res.json();
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.reply || "কোনো উত্তর পাওয়া যায়নি।" },
            ]);
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `⚠️ এরর: ${err?.message || "সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি"}`,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Top Navigation */}
            <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("overview")}>
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                            EduTrack
                        </span>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setActiveTab("overview")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "overview" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab("videos")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "videos" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Video Lectures
                        </button>
                        <button
                            onClick={() => setActiveTab("sheets")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "sheets" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Lecture Sheets
                        </button>

                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 text-sm text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors ml-2"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                    <div>
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-white">Student Dashboard</h1>
                            <p className="text-slate-400 text-sm mt-1">
                                তোমার একাডেমিক লেকচার, স্টাডি মেটেরিয়াল এবং এআই অ্যাসিস্ট্যান্ট এখানে এক সাথে।
                            </p>
                        </div>

                        {/* Clickable Action Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div
                                onClick={() => setActiveTab("videos")}
                                className="group cursor-pointer bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                                        <Video className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-semibold text-lg text-white">Video Lectures</h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        অধ্যায়ভিত্তিক ফিজিক্স ও কেমিস্ট্রির রেকর্ডেড ক্লাসসমূহ ব্রাউজ ও প্লে করো।
                                    </p>
                                </div>
                                <div className="flex items-center text-sm text-indigo-400 font-medium mt-6">
                                    <span>ক্লাসগুলো দেখতে ক্লিক করো</span>
                                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>

                            <div
                                onClick={() => setActiveTab("sheets")}
                                className="group cursor-pointer bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-semibold text-lg text-white">Lecture Sheets & Notes</h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        হাতে লেখা নোটস, অনুশীলনী প্রশ্ন এবং সমাধান শিট ডাউনলোড করো।
                                    </p>
                                </div>
                                <div className="flex items-center text-sm text-emerald-400 font-medium mt-6">
                                    <span>শিটগুলো দেখতে ক্লিক করো</span>
                                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: VIDEO LECTURES */}
                {activeTab === "videos" && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white">All Video Lectures</h2>
                                <p className="text-slate-400 text-sm">সিলেবাস অনুযায়ী সম্পূর্ণ ভিডিও লেকচার তালিকা</p>
                            </div>
                            <button
                                onClick={() => setActiveTab("overview")}
                                className="text-xs text-indigo-400 hover:underline"
                            >
                                ← Back to Dashboard
                            </button>
                        </div>

                        {videos.length === 0 ? (
                            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                                <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>কোনো ভিডিও লেকচার পাওয়া যায়নি অথবা সার্ভার লোড হচ্ছে।</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {videos.map((vid) => (
                                    <div
                                        key={vid.id}
                                        className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md font-medium">
                                                    {vid.subject}
                                                </span>
                                                <span>Lec #{vid.lecture_no}</span>
                                            </div>
                                            <h4 className="font-semibold text-white text-base leading-snug mb-1">
                                                {vid.title || vid.topic}
                                            </h4>
                                            <p className="text-xs text-slate-400 mb-4">{vid.chapter}</p>
                                        </div>

                                        <a
                                            href={vid.video_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-colors"
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                            <span>ভিডিও ক্লাস প্লে করো</span>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: LECTURE SHEETS */}
                {activeTab === "sheets" && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white">Lecture Sheets & Materials</h2>
                                <p className="text-slate-400 text-sm">অনুশীলনী প্রশ্নপত্র, প্র্যাকটিস সেট এবং ক্লাস নোটস</p>
                            </div>
                            <button
                                onClick={() => setActiveTab("overview")}
                                className="text-xs text-emerald-400 hover:underline"
                            >
                                ← Back to Dashboard
                            </button>
                        </div>

                        {materials.length === 0 ? (
                            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>কোনো স্টাডি শিট পাওয়া যায়নি অথবা সার্ভার লোড হচ্ছে।</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {materials.map((mat) => (
                                    <div
                                        key={mat.id}
                                        className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
                                    >
                                        <div>
                                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md font-medium text-xs mb-2 inline-block">
                                                {mat.subject}
                                            </span>
                                            <h4 className="font-semibold text-white text-base leading-snug mb-1">
                                                {mat.title}
                                            </h4>
                                            <p className="text-xs text-slate-400 mb-4">{mat.chapter}</p>
                                        </div>

                                        <a
                                            href={mat.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>শিট ডাউনলোড / ওপেন করো</span>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Floating Toggle Button */}
            {!isChatOpen && (
                <button
                    onClick={() => setIsChatOpen(true)}
                    className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition-transform hover:scale-105 z-50 flex items-center space-x-2"
                >
                    <MessageSquare className="w-6 h-6" />
                    <span className="text-sm font-medium pr-1">AI Tutor</span>
                </button>
            )}

            {/* Modern AI Chatbot Window (Pills Removed, Math & Memory Active) */}
            {isChatOpen && (
                <div className="fixed bottom-6 right-6 w-96 max-w-[92vw] h-[580px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 text-slate-100 font-sans">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/90 backdrop-blur border-b border-slate-700/60">
                        <div className="flex items-center space-x-2.5">
                            <div className="p-2 bg-indigo-600 rounded-xl shadow-md">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm leading-tight text-white">
                                    EduTrack AI Tutor
                                </h3>
                                <p className="text-[11px] text-emerald-400 font-medium">
                                    ● Online • Guide & Solver
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsChatOpen(false)}
                            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages List Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                                    }`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                                            ? "bg-indigo-600 text-white shadow-sm"
                                            : "bg-slate-800 text-slate-200 border border-slate-700/60"
                                        }`}
                                >
                                    {msg.role === "assistant" ? (
                                        <div className="prose prose-invert prose-sm max-w-none break-words [&>p]:mb-2 [&>p:last-child]:mb-0">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 border border-slate-700/60 rounded-2xl px-4 py-2.5 flex items-center space-x-2 text-slate-300 text-xs">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                    <span>EduTrack হিসাব ও বিশ্লেষণ করছে...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Form */}
                    <form
                        onSubmit={handleSendMessage}
                        className="p-3 bg-slate-800/80 border-t border-slate-700/60"
                    >
                        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 transition-colors">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask anything (Physics, Math, Chemistry)..."
                                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-100 placeholder-slate-500"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}