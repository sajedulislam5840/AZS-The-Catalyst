"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Sparkles,
  User,
  Users,
} from "lucide-react";
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

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [school, setSchool] = useState("");
  const [gradeClass, setGradeClass] = useState("Class 10");
  const [batchNo, setBatchNo] = useState("Batch 01");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      await api.post("/api/v1/auth/register", {
        full_name: fullName.trim(),
        email: email.trim(),
        password: password,
        school: school.trim(),
        grade_class: gradeClass,
        batch_no: batchNo,
      });

      // Redirect to login with pre-filled email
      router.push(`/login?email=${encodeURIComponent(email.trim())}`);
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err)
        ? (err.response?.data as { detail?: string } | undefined)?.detail
        : undefined;
      setErrorMsg(
        detail ||
          "Registration failed. Please check your connectivity and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      wide
      badge={
        <span className="hidden items-center gap-1.5 rounded-full border border-[#CC310E]/25 bg-[#FEF3EF] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#A8270B] sm:inline-flex">
          <Sparkles className="h-3 w-3" />
          Enrollment Open
        </span>
      }
    >
      <AuthHeading
        title="Create your student account"
        text="Join the catalyst for your academic excellence."
      />
      <ErrorAlert message={errorMsg} />

      <form onSubmit={handleRegister} className="space-y-4">
        <Field id="reg-name" label="Full Name" icon={User}>
          <input
            id="reg-name"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className={authInputClass}
          />
        </Field>

        <Field id="reg-email" label="Email Address" icon={Mail}>
          <input
            id="reg-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={authInputClass}
          />
        </Field>

        <Field
          id="reg-password"
          label="Create Password"
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
            id="reg-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            className={`${authInputClass} pr-11`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="reg-school" label="Institution" icon={Building2}>
            <input
              id="reg-school"
              type="text"
              required
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="School/College"
              className={authInputClass}
            />
          </Field>

          <Field id="reg-grade" label="Class / Grade" icon={GraduationCap}>
            <select
              id="reg-grade"
              value={gradeClass}
              onChange={(e) => setGradeClass(e.target.value)}
              className={`${authInputClass} cursor-pointer appearance-none`}
            >
              <option value="Class 9">Class 9</option>
              <option value="Class 10">Class 10</option>
              <option value="HSC 1st Year">HSC 1st Year</option>
              <option value="HSC 2nd Year">HSC 2nd Year</option>
            </select>
          </Field>
        </div>

        <Field id="reg-batch" label="Batch Designation" icon={Users}>
          <input
            id="reg-batch"
            type="text"
            required
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            placeholder="e.g. Batch 01"
            className={authInputClass}
          />
        </Field>

        <SubmitButton loading={loading} loadingText="Processing...">
          <span>Complete Registration</span>
          <ArrowRight className="h-4 w-4" />
        </SubmitButton>
      </form>

      <div className="mt-7 border-t border-sky-100 pt-5 text-center">
        <p className="text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-bold text-sky-700 underline-offset-4 hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
