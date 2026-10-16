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
    FlaskConical,
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
    {
        label: "⚛️ গতিবিদ্যা (Kinematics)",
        text: "নিউটনের গতির দ্বিতীয় সূত্র $F=ma$ প্রতিপাদন করো এবং বিস্তারিত বুঝিয়ে দাও।",
        subject: "physics" as const,
    },
    {
        label: "🧪 জারণ-বিজারণ (Redox)",
        text: "অম্লীয় মাধ্যমে $KMnO_4$ ও $FeSO_4$-এর সমতাকৃত বিক্রিয়া আয়ন-ইলেকট্রন পদ্ধতিতে দেখাও।",
        subject: "chemistry" as const,
    },
    {
        label: "📐 প্রাসের গতি (Projectile)",
        text: "প্রাসের গতিপথে সর্বোচ্চ উচ্চতা $H$ এবং অনুভূমিক পাল্লা $R$-এর সমীকরণ প্রতিপাদন করো।",
        subject: "physics" as const,
    },
    {
        label: "⚡ তড়িৎ রসায়ন (Electrochem)",
        text: "নার্নস্টের সমীকরণ (Nernst Equation) কীভাবে কাজ করে? উদাহরণসহ বুঝিয়ে বলো।",
        subject: "chemistry" as const,
    },
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
                "আসসালামু আলাইকুম! আমি **AZS AI Academic Tutor**। ফিজিক্স, কেমিস্ট্রি এর কোনো সমীকরণ, প্রমাণ ও গাণিতিক সমস্যার জন্য যেকোনো প্রশ্ন করতে পারো।",
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

    // Nord Soft Academic Cream containers — no drawer/slide motion
    const containerClasses = isEmbedded
        ? "w-full h-full min-h-[600px] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl overflow-hidden shadow-sm relative text-[#0F172A] font-sans"
        : "fixed inset-3 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[460px] sm:h-[640px] max-w-[100vw] h-[min(640px,calc(100dvh-1.5rem))] bg-white border border-[#E6E1D8] rounded-2xl shadow-xl flex flex-col overflow-hidden z-50 text-[#0F172A] font-sans";

    const chatContent = (
        <div className={containerClasses}>
            {/* Soft subject aura washes (static, non-animated chrome) */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#0369A1]/[0.06] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#047857]/[0.05] rounded-full blur-3xl pointer-events-none" />

            {/* TOP HEADER — sapphire academic bar */}
            <header className="px-3 sm:px-4 py-3 bg-[#1E3A8A] border-b border-[#1E3A8A] flex items-center justify-between gap-2 z-10 relative min-h-[56px]">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Sessions toggle — instant panel, no slide drawer */}
                    <button
                        onClick={() => setIsSidebarOpen((prev) => !prev)}
                        type="button"
                        className={`min-h-[48px] min-w-[48px] px-3 rounded-xl border transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 ${
                            isSidebarOpen
                                ? "bg-white text-[#1E3A8A] border-white"
                                : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                        }`}
                        title="Chat History (Retrack)"
                        aria-label="Toggle chat sessions"
                    >
                        <History className="w-4 h-4" />
                        <span className="hidden sm:inline">সেশন</span>
                    </button>

                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white text-[#1E3A8A] flex items-center justify-center shrink-0 shadow-sm">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5 truncate">
                                AZS AI Catalyst
                            </h3>
                            <p className="text-[11px] text-emerald-300 font-medium flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                                </span>
                                AI Online
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right controls: Dual Model Selector + Close */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Model Switcher Pill */}
                    <div className="flex items-center bg-[#0F172A]/25 border border-white/20 rounded-xl p-1">
                        <button
                            type="button"
                            onClick={() => setSelectedModel("deepseek")}
                            className={`flex items-center gap-1 min-h-[40px] px-2.5 sm:px-3 rounded-lg text-[10px] sm:text-[11px] font-bold transition-colors ${
                                selectedModel === "deepseek"
                                    ? "bg-white text-[#1E3A8A] shadow-sm"
                                    : "text-white/80 hover:text-white hover:bg-white/10"
                            }`}
                            title="DeepSeek R1: Advanced mathematical reasoning and step-by-step derivations"
                        >
                            <BrainCircuit className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline sm:inline">DeepSeek</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedModel("groq")}
                            className={`flex items-center gap-1 min-h-[40px] px-2.5 sm:px-3 rounded-lg text-[10px] sm:text-[11px] font-bold transition-colors ${
                                selectedModel === "groq"
                                    ? "bg-white text-[#0369A1] shadow-sm"
                                    : "text-white/80 hover:text-white hover:bg-white/10"
                            }`}
                            title="Groq Fast: Ultra-fast explanations and concept guidance"
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline sm:inline">Groq</span>
                        </button>
                    </div>

                    {!isEmbedded && onClose && (
                        <button
                            onClick={onClose}
                            type="button"
                            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-white/90 hover:text-white rounded-xl hover:bg-white/15 transition-colors border border-transparent hover:border-white/20"
                            aria-label="Close Chat"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </header>

            {/* MAIN CONTENT — sessions panel is instant (no slide / drawer animation) */}
            <div className="flex-1 flex overflow-hidden relative z-10 bg-[#FAF8F5]">
                {/* SESSIONS HISTORY PANEL — instant show/hide, no motion drawer */}
                {isSidebarOpen && (
                    <aside className="absolute inset-y-0 left-0 w-[min(100%,20rem)] sm:w-80 bg-white border-r border-[#E6E1D8] p-4 flex flex-col z-30 shadow-lg">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#E6E1D8]">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] flex items-center gap-2">
                                <History className="w-4 h-4 text-[#0369A1]" /> পূর্বের সেশন
                            </h4>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                type="button"
                                className="min-h-[48px] min-w-[48px] flex items-center justify-center text-[#64748B] hover:text-[#1E3A8A] rounded-xl hover:bg-[#FAF8F5] transition-colors border border-transparent hover:border-[#E6E1D8]"
                                aria-label="Close sessions"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        </div>

                        {/* + New Chat Button */}
                        <button
                            onClick={handleNewChat}
                            type="button"
                            className="w-full min-h-[48px] py-2.5 px-3 mb-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 shrink-0 bg-[#1E3A8A] text-white hover:bg-[#1e40af] transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            নতুন কথোপকথন শুরু করো
                        </button>

                        {/* Sessions List */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                            {sessions.length === 0 ? (
                                <p className="text-[#94A3B8] text-sm text-center py-8">
                                    কোনো পূর্বের কথোপকথন পাওয়া যায়নি।
                                </p>
                            ) : (
                                sessions.map((s) => (
                                    <div
                                        key={s.id}
                                        onClick={() => loadSessionHistory(s.id)}
                                        className={`group p-3 rounded-xl border text-left cursor-pointer transition-colors flex items-start justify-between gap-2 min-h-[52px] ${
                                            currentSessionId === s.id
                                                ? "bg-[#EFF6FF] border-[#1E3A8A]/40 text-[#0F172A]"
                                                : "bg-[#FAF8F5] border-[#E6E1D8] text-[#334155] hover:bg-white hover:border-[#0369A1]/35"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2 min-w-0">
                                            <MessageSquare className="w-4 h-4 mt-0.5 text-[#0369A1] shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate leading-tight">
                                                    {s.title}
                                                </p>
                                                <span className="text-[11px] font-medium text-[#64748B]">
                                                    {s.model === "groq" ? "⚡ Groq" : "🧠 DeepSeek"}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteSession(s.id, e)}
                                            type="button"
                                            className="min-h-[44px] min-w-[44px] flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 text-[#94A3B8] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                            title="মুছে ফেলো"
                                            aria-label="Delete session"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>
                )}

                {/* Dim scrim when sessions open — tap to close, no animation */}
                {isSidebarOpen && (
                    <button
                        type="button"
                        className="absolute inset-0 z-20 bg-[#0F172A]/20 sm:bg-[#0F172A]/10 border-0 cursor-pointer"
                        aria-label="Close sessions overlay"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* MESSAGES FEED */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-sm no-scrollbar">
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
                                        ? "bg-[#1E3A8A] text-white rounded-br-md shadow-sm"
                                        : "bg-white text-[#0F172A] rounded-bl-md border border-[#E6E1D8] shadow-sm"
                                }`}
                            >
                                {msg.role === "assistant" ? (
                                    <>
                                        {/* AI Catalyst badge */}
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[10px] font-bold uppercase tracking-wide text-[#1E3A8A]">
                                                <Sparkles className="w-3 h-3" />
                                                AI Catalyst
                                            </span>
                                        </div>

                                        <div className="prose prose-sm max-w-none break-words leading-relaxed text-[#0F172A] prose-headings:text-[#1E3A8A] prose-a:text-[#0369A1] prose-code:text-[#047857] prose-pre:bg-[#FAF8F5] prose-pre:border prose-pre:border-[#E6E1D8]">
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
                                            type="button"
                                            className="absolute top-2 right-2 min-h-[40px] min-w-[40px] flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 rounded-lg bg-[#FAF8F5] text-[#64748B] hover:text-[#1E3A8A] transition-colors border border-[#E6E1D8]"
                                            title="Copy reply"
                                            aria-label="Copy reply"
                                        >
                                            {copiedIndex === index ? (
                                                <Check className="w-4 h-4 text-[#047857]" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <p className="whitespace-pre-wrap text-[14px] sm:text-sm">{msg.content}</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Quick topic suggestion chips — subject-tinted */}
                    {messages.length <= 1 && (
                        <div className="pt-2 pb-1">
                            <p className="text-[11px] font-bold text-[#64748B] mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                                <Sparkles className="w-3.5 h-3.5 text-[#0369A1]" /> ঝটপট প্রশ্ন করো
                                (Suggested Topics):
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {SUGGESTED_PROMPTS.map((p, idx) => {
                                    const isPhysics = p.subject === "physics";
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSend(p.text)}
                                            className={`text-left p-3 min-h-[48px] rounded-xl border transition-colors text-sm group ${
                                                isPhysics
                                                    ? "bg-[#F0F9FF] border-[#BAE6FD] hover:border-[#0369A1] hover:bg-[#E0F2FE]"
                                                    : "bg-[#ECFDF5] border-[#A7F3D0] hover:border-[#047857] hover:bg-[#D1FAE5]"
                                            }`}
                                        >
                                            <p
                                                className={`font-bold text-[12px] mb-0.5 flex items-center gap-1 ${
                                                    isPhysics ? "text-[#0369A1]" : "text-[#047857]"
                                                }`}
                                            >
                                                {isPhysics ? (
                                                    <Atom className="w-3.5 h-3.5 shrink-0" />
                                                ) : (
                                                    <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                                                )}
                                                {p.label}
                                            </p>
                                            <p className="text-[11px] text-[#64748B] line-clamp-1 group-hover:text-[#334155]">
                                                {p.text}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Thinking indicator — azure 3-dot wave style */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-[#E6E1D8] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-3 text-[#334155] text-sm shadow-sm">
                                <div className="flex items-center gap-1" aria-hidden>
                                    <span className="w-2 h-2 rounded-full bg-[#0369A1] animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-2 h-2 rounded-full bg-[#0369A1] animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-2 h-2 rounded-full bg-[#0369A1] animate-bounce" />
                                </div>
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-[#0369A1]" />
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

            {/* BOTTOM INPUT BAR — thumb-zone, 48px targets, safe area */}
            <footer className="p-3 sm:p-3.5 bg-white border-t border-[#E6E1D8] z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex items-center gap-2 bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl px-3 py-1.5 focus-within:border-[#1E3A8A]/50 focus-within:ring-2 focus-within:ring-[#1E3A8A]/15 transition-colors"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`Ask ${
                            selectedModel === "deepseek"
                                ? "DeepSeek R1 (Math & Reasoning)"
                                : "Groq Fast"
                        }...`}
                        className="flex-1 min-h-[48px] bg-transparent border-none outline-none text-sm sm:text-[15px] text-[#0F172A] placeholder-[#94A3B8] py-2"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="min-h-[48px] min-w-[48px] flex items-center justify-center bg-[#1E3A8A] text-white rounded-xl hover:bg-[#1e40af] disabled:opacity-35 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
                        aria-label="Send message"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </footer>
        </div>
    );

    // Embedded: direct render. Floating: instant mount/unmount — no drawer / scale / slide animation
    if (isEmbedded) return chatContent;
    if (!isOpen) return null;
    return chatContent;
}
