"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Send, X, Sparkles, Loader2 } from "lucide-react";

export interface Message {
    role: "user" | "assistant";
    content: string;
}

export interface EduTrackAiChatProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function EduTrackAiChat({ isOpen, onClose }: EduTrackAiChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "সালাম! আমি EduTrack AI Academic Tutor। ফিজিক্স, কেমিস্ট্রি বা যেকোনো গাণিতিক সমস্যার জন্য প্রশ্ন করতে পারো।",
        },
    ]);
    const [input, setInput] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isLoading, isOpen]);

    const handleSend = async (e?: React.FormEvent) => {
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
                process.env.NEXT_PUBLIC_API_URL ||
                "https://edutrack-backend.onrender.com";

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
                    content: `⚠️ এরর: ${err?.message || "সার্ভারের সাথে সংযোগ বিচ্ছিন্ন"}`,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 w-96 max-w-[92vw] h-[560px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 text-slate-100 font-sans">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/90 backdrop-blur border-b border-slate-700/60">
                <div className="flex items-center space-x-2">
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
                    onClick={onClose}
                    type="button"
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                    aria-label="Close Chat"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-800 text-slate-200 border border-slate-700/60"
                                }`}
                        >
                            {msg.role === "assistant" ? (
                                <div className="prose prose-invert prose-sm max-w-none break-words">
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
                        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl px-4 py-2 flex items-center space-x-2 text-slate-300 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                            <span>EduTrack সমাধান তৈরি করছে...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form
                onSubmit={handleSend}
                className="p-3 bg-slate-800/80 border-t border-slate-700/60"
            >
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:border-indigo-500">
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
    );
}