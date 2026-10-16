"use client";

import React from "react";
import { DEVELOPER, TEACHER } from "@/lib/social";
import {
  ExternalLink,
  MessageCircle,
  Facebook,
  Youtube,
  Linkedin,
  Github,
  Globe,
} from "lucide-react";

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
          {/* TEACHER/MENTOR COLUMN */}
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
            <div className="flex items-center gap-2 pt-1">
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
                <Facebook className="w-4 h-4" />
              </a>

              <a
                href={TEACHER.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#F3EFE8] hover:bg-[#E6E1D8] text-[#BE123C] transition flex items-center justify-center active:scale-95 border border-[#E6E1D8]"
                title="YouTube Channel"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* DEVELOPER COLUMN */}
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

            {/* DEVELOPER SOCIAL & PORTFOLIO LINKS */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href={DEVELOPER.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 py-2 rounded-xl bg-[#F3EFE8] hover:bg-[#E6E1D8] text-[#1E3A8A] text-xs font-bold transition flex items-center gap-1.5 border border-[#E6E1D8] active:scale-95"
              >
                <Linkedin className="w-3.5 h-3.5 text-[#0369A1]" />
                <span>LinkedIn</span>
              </a>

              <a
                href={DEVELOPER.github}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 py-2 rounded-xl bg-[#F3EFE8] hover:bg-[#E6E1D8] text-[#1E293B] text-xs font-bold transition flex items-center gap-1.5 border border-[#E6E1D8] active:scale-95"
              >
                <Github className="w-3.5 h-3.5 text-[#1E293B]" />
                <span>GitHub</span>
              </a>

              <a
                href={DEVELOPER.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 py-2 rounded-xl bg-[#1E3A8A] hover:bg-[#1E40AF] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Portfolio</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
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
