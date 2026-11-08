"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, FileText, LogOut, Megaphone, RefreshCw, ShieldCheck, Users, Video } from "lucide-react";
import api from "@/lib/api";
import SiteFooter from "@/components/SiteFooter";
import LecturesTab from "@/components/admin/LecturesTab";
import MaterialsTab from "@/components/admin/MaterialsTab";
import NoticesTab from "@/components/admin/NoticesTab";
import OverviewTab from "@/components/admin/OverviewTab";
import StudentDrawer from "@/components/admin/StudentDrawer";
import StudentsTab from "@/components/admin/StudentsTab";
import { errorText, httpStatus } from "@/components/admin/format";
import type { Lecture, MaterialRow, NoticeRow, Overview, Student, SubStatus } from "@/components/admin/types";
import { AdminUiProvider, Spinner } from "@/components/admin/ui";

type Tab = "overview" | "students" | "lectures" | "materials" | "notices";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "students", label: "Students", icon: <Users className="h-4 w-4" /> },
  { id: "lectures", label: "Lectures", icon: <Video className="h-4 w-4" /> },
  { id: "materials", label: "Sheets", icon: <FileText className="h-4 w-4" /> },
  { id: "notices", label: "Notices", icon: <Megaphone className="h-4 w-4" /> },
];

/** Loads one admin list. The server is the real gatekeeper: 401 means sign in again, 403 means not an admin. */
function useAdminData<T>(path: string, enabled: boolean, onAuthFail: (status: number) => void) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<T>(path);
      setData(res.data);
      setError(null);
    } catch (err) {
      const status = httpStatus(err);
      if (status === 401 || status === 403) onAuthFail(status);
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [path, onAuthFail]);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [enabled, load]);

  const retry = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  return { data, loading, error, reload: load, retry };
}

export default function AdminPage() {
  return (
    <AdminUiProvider>
      <AdminShell />
    </AdminUiProvider>
  );
}

function AdminShell() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [filter, setFilter] = useState<SubStatus | "ALL">("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    const role = (localStorage.getItem("user_role") || "").toUpperCase();
    const mail = (localStorage.getItem("user_email") || "").toLowerCase();
    // Only a convenience: the API checks admin rights on every request regardless of this.
    if (!role.endsWith("ADMIN") && mail !== "rabbi@edutrack.com") {
      router.replace("/dashboard");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(mail);
    setReady(true);
  }, [router]);

  const onAuthFail = useCallback(
    (status: number) => {
      if (status === 401) {
        localStorage.clear();
        router.replace("/login");
      } else {
        router.replace("/dashboard");
      }
    },
    [router]
  );

  const overview = useAdminData<Overview>("/api/v1/admin/overview", ready, onAuthFail);
  const students = useAdminData<Student[]>("/api/v1/admin/students", ready, onAuthFail);
  const lectures = useAdminData<Lecture[]>("/api/v1/admin/lectures", ready, onAuthFail);
  const materials = useAdminData<MaterialRow[]>("/api/v1/admin/materials", ready, onAuthFail);
  const notices = useAdminData<NoticeRow[]>("/api/v1/admin/notices", ready, onAuthFail);

  const studentsChanged = useCallback(() => {
    void overview.reload();
    void students.reload();
  }, [overview, students]);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.allSettled([overview.reload(), students.reload(), lectures.reload(), materials.reload(), notices.reload()]);
    setRefreshing(false);
  };

  const logout = () => {
    localStorage.clear();
    router.replace("/login");
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F8FC]">
        <Spinner className="h-6 w-6 text-[#075985]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F8FC] text-[#0F172A]">
      <header className="sticky top-0 z-40 border-b border-[#D3E3EF] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#075985] text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black leading-tight text-[#075985]">AZS Admin</h1>
            <p className="truncate text-[11px] text-slate-500">{email}</p>
          </div>
          <button type="button" onClick={() => void refreshAll()} aria-label="Refresh everything" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button type="button" onClick={logout} aria-label="Log out" className="flex h-11 w-11 items-center justify-center rounded-xl text-[#CC310E] hover:bg-rose-50">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        <nav className="mx-auto max-w-5xl overflow-x-auto px-3" aria-label="Admin sections">
          <div className="flex min-w-max gap-1 pb-2" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${
                  tab === t.id ? "bg-[#075985] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {tab === "overview" && (
          <OverviewTab
            data={overview.data}
            loading={overview.loading}
            error={overview.error}
            onRetry={overview.retry}
            onOpenStudent={setOpenId}
            onFilter={(f) => {
              setFilter(f);
              setTab("students");
            }}
            onTab={setTab}
          />
        )}
        {tab === "students" && (
          <StudentsTab
            students={students.data ?? []}
            loading={students.loading}
            error={students.error}
            filter={filter}
            onFilter={setFilter}
            onOpen={setOpenId}
            onChanged={studentsChanged}
            onRetry={students.retry}
          />
        )}
        {tab === "lectures" && (
          <LecturesTab
            lectures={lectures.data ?? []}
            loading={lectures.loading}
            error={lectures.error}
            onChanged={() => {
              void lectures.reload();
              void overview.reload();
            }}
            onRetry={lectures.retry}
          />
        )}
        {tab === "materials" && (
          <MaterialsTab
            materials={materials.data ?? []}
            loading={materials.loading}
            error={materials.error}
            onChanged={() => {
              void materials.reload();
              void overview.reload();
            }}
            onRetry={materials.retry}
          />
        )}
        {tab === "notices" && <NoticesTab notices={notices.data ?? []} loading={notices.loading} error={notices.error} onChanged={() => void notices.reload()} onRetry={notices.retry} />}
      </main>

      <StudentDrawer key={openId ?? "none"} studentId={openId} onClose={() => setOpenId(null)} onChanged={studentsChanged} />
      <SiteFooter />
    </div>
  );
}
