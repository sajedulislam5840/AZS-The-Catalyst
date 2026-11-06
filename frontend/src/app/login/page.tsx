"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import api from "@/lib/api";
import {
  AuthHeading,
  AuthShell,
  ErrorAlert,
  Field,
  SubmitButton,
  authInputClass,
} from "@/components/auth/AuthUI";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await api.post("/api/v1/auth/login", {
        email: email.trim(),
        password: password,
      });

      const token = res.data.access_token || res.data.token;
      if (!token) {
        throw new Error("Authentication token not received.");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("access_token", token);

      const userRole = res.data.role || "STUDENT";
      const userEmail = email.trim().toLowerCase();

      localStorage.setItem("user_role", userRole);
      localStorage.setItem("user_email", userEmail);
      if (res.data.full_name) {
        localStorage.setItem("user_name", res.data.full_name);
      }
      if (res.data.batch_no) {
        localStorage.setItem("batch_no", res.data.batch_no);
      }

      if (
        userRole.toUpperCase() === "ADMIN" ||
        userEmail === "rabbi@edutrack.com"
      ) {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err)
        ? (err.response?.data as { detail?: string } | undefined)?.detail
        : undefined;
      setErrorMsg(
        detail ||
          "Invalid email or password. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge={
        <span className="hidden items-center gap-1.5 rounded-full border border-sky-200 bg-white/70 px-3 py-1.5 text-[11px] font-bold text-sky-800 sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
          Secure Portal
        </span>
      }
    >
      <AuthHeading
        title="Sign in to your portal"
        text="Enter your student or instructor credentials to access classes."
      />
      <ErrorAlert message={errorMsg} />

      <form onSubmit={handleLogin} className="space-y-4">
        <Field id="login-email" label="Email Address" icon={Mail}>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            className={authInputClass}
          />
        </Field>

        <Field
          id="login-password"
          label="Password"
          icon={Lock}
          right={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 transition-colors hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        >
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`${authInputClass} pr-11`}
          />
        </Field>

        <SubmitButton loading={loading} loadingText="Authenticating...">
          <span>Sign In to Dashboard</span>
          <ArrowRight className="h-4 w-4" />
        </SubmitButton>
      </form>

      <div className="mt-7 border-t border-sky-100 pt-5 text-center">
        <p className="text-xs text-slate-600">
          Don&apos;t have a batch account yet?{" "}
          <Link href="/register" className="font-bold text-[#CC310E] hover:underline">
            Get started
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F3F8FC]" />}>
      <LoginContent />
    </Suspense>
  );
}
