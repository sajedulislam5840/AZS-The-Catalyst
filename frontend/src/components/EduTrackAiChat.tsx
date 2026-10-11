"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
    Send,
    X,
    Sparkles,
    Loader2,
    History,
    Plus,
    Trash2,
    Copy,
    Check,
    MessageSquare,
    Zap,
    BrainCircuit,
    ChevronLeft,
    Atom,
    FlaskConical
} from "lucide-react";

export interface Message {
    id?: string;
    role: "user" | "assistant";
    content: string;
}

export interface ChatSessionItem {
    id: string;
    title: string;
    model: string;
    created_at: string;
    updated_at: string;
    message_count?: number;
}

export interface EduTrackAiChatProps {
    isOpen?: boolean;
    onClose?: () => void;
    isEmbedded?: boolean; // When true, rendered directly in dashboard page instead of floating popup
}

const BACKEND_URL = (
    process.env.NEXT_PUBLIC_API_URL || "https://edutrack-backend-qjxg.onrender.com"
).replace(/\/$/, "");

const SUGGESTED_PROMPTS = [
    { label: "⚛️ গতিবিদ্যা (Kinematics)", text: "নিউটনের গতির দ্বিতীয় সূত্র $F=ma$ প্রতিপাদন করো এবং বিস্তারিত বুঝিয়ে দাও।" },
    { label: "🧪 জারণ-বিজারণ (Redox)", text: "অম্লীয় মাধ্যমে $KMnO_4$ ও $FeSO_4$-এর সমতাকৃত বিক্রিয়া আয়ন-ইলেকট্রন পদ্ধতিতে দেখাও।" },
    { label: "📐 প্রাসের গতি (Projectile)", text: "প্রাসের গতিপথে সর্বোচ্চ উচ্চতা $H$ এবং অনুভূমিক পাল্লা $R$-এর সমীকরণ প্রতিপাদন করো।" },
    { label: "⚡ তড়িৎ রসায়ন (Electrochem)", text: "নার্নস্টের সমীকরণ (Nernst Equation) কীভাবে কাজ করে? উদাহরণসহ বুঝিয়ে বলো।" },
];

export default function EduTrackAiChat({
    isOpen = true,
    onClose,
    isEmbedded = false,
}: EduTrackAiChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "আসসালামু আলাইকুম! আমি **AZS AI Academic Tutor**। ফিজিক্স, কেমিস্ট্রি কিংবা উচ্চতর গণিতের যেকোনো সমীকরণ, প্রমাণ ও গাণিতিক সমস্যার জন্য যেকোনো প্রশ্ন করতে পারো।",
        },
    ]);
    const [input, setInput] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectedModel, setSelectedModel] = useState<"deepseek" | "groq">("deepseek");

    // Session Retracking States
    const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isLoading, isOpen, scrollToBottom]);

    const getAuthHeaders = (): Record<string, string> => {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("token") || localStorage.getItem("access_token");
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
        }
        return headers;
    };

    // Load Sessions List (Chat Retracking)
    const loadSessions = useCallback(async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/v1/ai/sessions`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setSessions(Array.isArray(data) ? data : []);
            }
        } catch {
            // Quietly fallback for guest users
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadSessions();
        }
    }, [isOpen, loadSessions]);

    // Load Specific Session Messages (Retrack a previous chat)
    const loadSessionHistory = async (sessionId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/v1/ai/sessions/${sessionId}`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentSessionId(data.id);
                if (data.model) {
                    setSelectedModel(data.model === "groq" ? "groq" : "deepseek");
                }
                if (Array.isArray(data.messages) && data.messages.length > 0) {
                    setMessages(
                        data.messages.map((m: any) => ({
                            id: m.id,
                            role: m.role,
                            content: m.content,
                        }))
                    );
                } else {
                    setMessages([
                        {
                            role: "assistant",
                            content: `**${data.title}** সেশন চালু হয়েছে। তোমার প্রশ্ন জিজ্ঞেস করো।`,
                        },
                    ]);
                }
                setIsSidebarOpen(false);
            }
        } catch (err: any) {
            console.error("Failed to load session:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Start a Fresh New Chat
    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([
            {
                role: "assistant",
                content:
                    "আসসালামু আলাইকুম! নতুন সেশন শুরু হয়েছে। পদার্থবিজ্ঞান, রসায়ন বা গণিতের যেকোনো সমীকরণ ও ব্যাখ্যা জানতে চাও?",
            },
        ]);
        setIsSidebarOpen(false);
    };

    // Delete a Chat Session
    const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`${BACKEND_URL}/api/v1/ai/sessions/${sessionId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                setSessions((prev) => prev.filter((s) => s.id !== sessionId));
                if (currentSessionId === sessionId) {
                    handleNewChat();
                }
            }
        } catch (err) {
            console.error("Failed to delete session:", err);
        }
    };

    // Send Question
    const handleSend = async (promptToSend?: string) => {
        const text = (promptToSend || input).trim();
        if (!text || isLoading) return;

        const userMessage: Message = { role: "user", content: text };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Prepare multi-turn conversation history
            const historyPayload = messages
                .filter((_, idx) => idx !== 0)
                .slice(-8)
                .map((m) => ({ role: m.role, content: m.content }));

            const res = await fetch(`${BACKEND_URL}/api/v1/ai/chat`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    prompt: text,
                    session_id: currentSessionId,
                    model: selectedModel,
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

            if (data.session_id) {
                setCurrentSessionId(data.session_id);
            }

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: replyContent },
            ]);

            // Refresh sessions list in background to display new title
            loadSessions();
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `⚠️ এরর: ${err?.message || "সার্ভারের সাথে সংযোগ বিচ্ছিন্ন"}`,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    if (!isOpen && !isEmbedded) return null;

    // Container styling: Embedded fills dashboard container, Floating is fixed drawer
    const containerClasses = isEmbedded
        ? "w-full h-full min-h-[600px] flex flex-col bg-[#0B101D] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative text-slate-100 font-sans"
        : "fixed inset-3 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[440px] sm:h-[620px] max-w-[100vw] h-[min(620px,calc(100dvh-1.5rem))] bg-[#0B101D] border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 text-slate-100 font-sans";

    return (
        <div className={containerClasses}>
            {/* TOP HEADER */}
            <header className="px-4 py-3 bg-[#131826]/95 backdrop-blur border-b border-slate-800 flex items-center justify-between gap-2 z-10">
                <div className="flex items-center gap-2">
                    {/* Retrack Sidebar Toggle */}
                    <button
                        onClick={() => setIsSidebarOpen((prev) => !prev)}
                        type="button"
                        className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                            isSidebarOpen
                                ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                                : "bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800"
                        }`}
                        title="Chat History (Retrack)"
                    >
                        <History className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">সেশন</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-xs sm:text-sm leading-tight text-white flex items-center gap-1.5">
                                AZS AI Tutor
                            </h3>
                            <p className="text-[10px] text-emerald-400 font-medium">● Online Guide &amp; Solver</p>
                        </div>
                    </div>
                </div>

                {/* Right controls: Dual Model Selector + Close (if floating) */}
                <div className="flex items-center gap-1.5">
                    {/* Model Switcher Pill */}
                    <div className="flex items-center bg-[#090D16] border border-slate-800 rounded-xl p-0.5">
                        <button
                            type="button"
                            onClick={() => setSelectedModel("deepseek")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                selectedModel === "deepseek"
                                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                            title="DeepSeek R1: Advanced mathematical reasoning and step-by-step derivations"
                        >
                            <BrainCircuit className="w-3 h-3 text-cyan-300" />
                            <span>DeepSeek R1</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedModel("groq")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                selectedModel === "groq"
                                    ? "bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                            title="Groq Fast: Ultra-fast explanations and concept guidance"
                        >
                            <Zap className="w-3 h-3 text-amber-300" />
                            <span>Groq Fast</span>
                        </button>
                    </div>

                    {!isEmbedded && onClose && (
                        <button
                            onClick={onClose}
                            type="button"
                            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors ml-1"
                            aria-label="Close Chat"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            {/* MAIN CONTENT AREA WITH OPTIONAL RETRACK SIDEBAR OVERLAY */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* SESSIONS HISTORY DRAWER (RETRACK CHATS) */}
                {isSidebarOpen && (
                    <aside className="absolute inset-y-0 left-0 w-72 sm:w-80 bg-[#0B101D]/98 backdrop-blur-md border-r border-slate-800 p-4 flex flex-col z-20 shadow-2xl transition-all">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                <History className="w-4 h-4 text-cyan-400" /> পূর্বের কথোপকথন (Retrack)
                            </h4>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        </div>

                        {/* + New Chat Button */}
                        <button
                            onClick={handleNewChat}
                            className="w-full py-2.5 px-3 mb-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            নতুন কথোপকথন শুরু করো
                        </button>

                        {/* Sessions List */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                            {sessions.length === 0 ? (
                                <p className="text-slate-500 text-xs text-center py-8">
                                    কোনো পূর্বের কথোপকথন পাওয়া যায়নি।
                                </p>
                            ) : (
                                sessions.map((s) => (
                                    <div
                                        key={s.id}
                                        onClick={() => loadSessionHistory(s.id)}
                                        className={`group p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                                            currentSessionId === s.id
                                                ? "bg-indigo-600/15 border-indigo-500/50 text-white"
                                                : "bg-[#131826]/70 border-slate-800/80 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2 min-w-0">
                                            <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-indigo-400 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold truncate leading-tight">
                                                    {s.title}
                                                </p>
                                                <span className="text-[10px] text-slate-500">
                                                    {s.model === "groq" ? "⚡ Groq" : "🧠 DeepSeek"}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteSession(s.id, e)}
                                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition-opacity"
                                            title="মুছে ফেলো"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>
                )}

                {/* MESSAGES FEED */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${
                                msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                        >
                            <div
                                className={`group relative max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 py-3 leading-relaxed ${
                                    msg.role === "user"
                                        ? "bg-indigo-600 text-white rounded-br-none font-medium shadow-lg shadow-indigo-600/20"
                                        : "bg-[#131826] text-slate-200 rounded-bl-none border border-slate-800/80 shadow-md"
                                }`}
                            >
                                {msg.role === "assistant" ? (
                                    <>
                                        <div className="prose prose-invert prose-xs sm:prose-sm max-w-none break-words leading-relaxed">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Copy button */}
                                        <button
                                            onClick={() => copyToClipboard(msg.content, index)}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-slate-800/90 text-slate-400 hover:text-white transition-opacity"
                                            title="Copy reply"
                                        >
                                            {copiedIndex === index ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Quick topic suggestion chips (shown when starting a clean session) */}
                    {messages.length <= 1 && (
                        <div className="pt-2 pb-1">
                            <p className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-cyan-400" /> ঝটপট প্রশ্ন করো (Suggested Topics):
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {SUGGESTED_PROMPTS.map((p, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSend(p.text)}
                                        className="text-left p-2.5 rounded-xl bg-[#131826]/80 hover:bg-[#1a2133] border border-slate-800/80 hover:border-indigo-500/50 transition-all text-xs text-slate-300 hover:text-white"
                                    >
                                        <p className="font-bold text-[11px] text-cyan-300 mb-0.5">{p.label}</p>
                                        <p className="text-[10px] text-slate-400 line-clamp-1">{p.text}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-[#131826] border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center space-x-2.5 text-slate-300 text-xs shadow-md animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                                <span>
                                    {selectedModel === "deepseek"
                                        ? "DeepSeek R1 গভীর বিশ্লেষণ করছে..."
                                        : "Groq Fast সমাধান তৈরি করছে..."}
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* BOTTOM INPUT BAR */}
            <footer className="p-3 bg-[#131826]/95 border-t border-slate-800 z-10">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex items-center gap-2 bg-[#090D16] border border-slate-800 rounded-2xl px-3 py-1.5 focus-within:border-indigo-500 transition-colors"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`Ask ${
                            selectedModel === "deepseek" ? "DeepSeek R1 (Math & Reasoning)" : "Groq Fast"
                        }...`}
                        className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-slate-100 placeholder-slate-500 py-1"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shadow-md shadow-indigo-600/20"
                        aria-label="Send message"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </form>
            </footer>
        </div>
    );
}
