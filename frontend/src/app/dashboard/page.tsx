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
    User
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function DashboardPage() {
    const router = useRouter();

    // চ্যাটবট স্টেট
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

    // অটো-স্ক্রোল
    useEffect(() => {
        if (isChatOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading, isChatOpen]);

    // লগআউট হ্যান্ডলার
    const handleLogout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("token");
        }
        router.push("/login");
    };

    // চ্যাট মেসেজ পাঠানোর ফাংশন (মেমোরি সহ)
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const promptText = input.trim();
        if (!promptText || isLoading) return;

        const userMessage: Message = { role: "user", content: promptText };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // সিস্টেম ওয়েলকাম মেসেজ বাদে আগের কথোপকথনের হিস্ট্রি ব্যাকএন্ডে পাঠানো
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

            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

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
            const replyContent = data.reply || "কোনো উত্তর পাওয়া যায়নি।";

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: replyContent },
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
            {/* টপ ন্যাভবার */}
            <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                            EduTrack
                        </span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 text-sm text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* মেইন ড্যাশবোর্ড বডি */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">Student Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        তোমার একাডেমিক লেকচার, স্টাডি মেটেরিয়াল এবং এআই অ্যাসিস্ট্যান্ট এখানে এক সাথে।
                    </p>
                </div>

                {/* কন্টেন্ট গ্রিড কার্ডস */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit mb-4">
                            <Video className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-lg text-white">Video Lectures</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            অধ্যায়ভিত্তিক ফিজিক্স ও কেমিস্ট্রির রেকর্ডেড ক্লাসসমূহ।
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-4">
                            <FileText className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-lg text-white">Lecture Sheets</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            হাতে লেখা নোটস, অনুশীলনী প্রশ্ন এবং সমাধান শিট।
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit mb-4">
                            <User className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-lg text-white">Study Progress</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            তোমার নিয়মিত পড়াশোনার ট্র্যাকিং ও আপডেট।
                        </p>
                    </div>
                </div>
            </main>

            {/* ফ্ল্লোটিং চ্যাট বাটন (যখন উইজেট বন্ধ থাকে) */}
            {!isChatOpen && (
                <button
                    onClick={() => setIsChatOpen(true)}
                    className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition-transform hover:scale-105 z-50 flex items-center space-x-2"
                >
                    <MessageSquare className="w-6 h-6" />
                    <span className="text-sm font-medium pr-1">AI Tutor</span>
                </button>
            )}

            {/* AI চ্যাটবট উইন্ডো (পিলস ছাড়া সম্পূর্ণ ক্লিন) */}
            {isChatOpen && (
                <div className="fixed bottom-6 right-6 w-96 max-w-[92vw] h-[580px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 text-slate-100 font-sans">
                    {/* হেডার */}
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

                    {/* ম্যাসেজ এরিয়া (LaTeX & Markdown সহ) */}
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

                    {/* ইনপুট ফিল্ড */}
                    <form
                        onSubmit={handleSendMessage}
                        className="p-3 bg-slate-800/80 border-t border-slate-700/60"
                    >
                        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 transition-colors">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask anything (Theory, Math, Derivations)..."
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