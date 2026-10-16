"use client";

import React from "react";
import { DEVELOPER, TEACHER } from "@/lib/social";
import { ExternalLink, MessageCircle, Globe } from "lucide-react";

// Inline brand SVGs for type-safe builds across all lucide-react versions
const FacebookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
  </svg>
);

const YoutubeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.016 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" clipRule="evenodd" />
  </svg>
);

const LinkedinIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 3a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

interface SiteFooterProps {
  compact?: boolean;
}

export default function SiteFooter({ compact = false }: SiteFooterProps) {
  const currentYear = 2025; // SSG safe

  return (
    <footer className="w-full bg-[#FFFFFF] border-t border-[#E6E1D8] text-[#1E293B] py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* TOP SECTION: ACADEMIC GUIDE & DEVELOPER CREDITS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-[#E6E1D8]">
          
          {/* ACADEMIC GUIDE / TEACHER COLUMN */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
              Academic Guidance & Mentorship
            </span>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#047857]/10 text-[#047857] border border-[#047857]/20 flex items-center justify-center font-bold text-sm shrink-0">
                AZS
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#1E3A8A]">
                  {TEACHER.name}
                </h4>
                <p className="text-xs text-[#64748b]">{TEACHER.role}</p>
              </div>
            </div>

            {/* TEACHER SOCIAL LINKS */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <a
                href={TEACHER.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Mentor</span>
              </a>

              <a
                href={TEACHER.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#F3EFE8] hover:bg-[#E6E1D8] text-[#1E3A8A] transition flex items-center justify-center active:scale-95 border border-[#E6E1D8]"
                title="Facebook Profile"
              >
                <FacebookIcon className="w-4 h-4 fill-[#1E3A8A]" />
              </a>

              <a
                href={TEACHER.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#F3EFE8] hover:bg-[#E6E1D8] text-[#BE123C] transition flex items-center justify-center active:scale-95 border border-[#E6E1D8]"
                title="YouTube Channel"
              >
                <YoutubeIcon className="w-4 h-4 fill-[#BE123C]" />
              </a>
            </div>
          </div>

          {/* PLATFORM DEVELOPER COLUMN */}
          <div className="space-y-3 md:text-right md:flex md:flex-col md:items-end">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
              Platform Architecture & Engineering
            </span>
            <div className="flex items-center space-x-3 md:flex-row-reverse md:space-x-reverse">
              <div className="w-10 h-10 rounded-xl bg-[#1E3A8A]/10 text-[#1E3A8A] border border-[#1E3A8A]/20 flex items-center justify-center font-bold text-xs shrink-0">
                DEV
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#1E3A8A]">
                  {DEVELOPER.name}
                </h4>
                <p className="text-xs text-[#64748b]">{DEVELOPER.role}</p>
              </div>
            </div>

            {/* DEVELOPER SOCIAL, CONTACT & PORTFOLIO LINKS */}
            <div className="flex items-center gap-2 pt-1 flex-wrap md:justify-end">
              <a
                href={DEVELOPER.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1E3A8A] hover:bg-[#1E40AF] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Portfolio</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              <a
                href={DEVELOPER.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#F3EFE8] hover:bg-[#E6E1D8] text-[#0369A1] transition flex items-center justify-center active:scale-95 border border-[#E6E1D8]"
                title="Developer LinkedIn"
              >
                <LinkedinIcon className="w-4 h-4 fill-[#0369A1]" />
              </a>

              <a
                href={DEVELOPER.github}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#F3EFE8] hover:bg-[#E6E1D8] text-[#1E293B] transition flex items-center justify-center active:scale-95 border border-[#E6E1D8]"
                title="Developer GitHub"
              >
                <GithubIcon className="w-4 h-4 fill-[#1E293B]" />
              </a>

              <a
                href={DEVELOPER.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#F3EFE8] hover:bg-[#E6E1D8] text-[#047857] transition flex items-center justify-center active:scale-95 border border-[#E6E1D8]"
                title="Developer WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-[#047857]" />
              </a>

              <a
                href={DEVELOPER.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#F3EFE8] hover:bg-[#E6E1D8] text-[#1E3A8A] transition flex items-center justify-center active:scale-95 border border-[#E6E1D8]"
                title="Developer Facebook"
              >
                <FacebookIcon className="w-4 h-4 fill-[#1E3A8A]" />
              </a>
            </div>
          </div>
        </div>

        {/* BOTTOM COPYRIGHT ROW */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748b]">
          <p>© {currentYear} AZS: The Catalyst. All rights reserved.</p>
          <p className="text-[11px] font-medium">
            Designed for Mobile, Tablet & Desktop • Built for HSC & Admission Excellence
          </p>
        </div>
      </div>
    </footer>
  );
}
