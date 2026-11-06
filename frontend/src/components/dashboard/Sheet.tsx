"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** "lg" is for the PDF viewer. */
  size?: "md" | "lg";
  footer?: ReactNode;
  headerExtra?: ReactNode;
}

/**
 * A dialog that slides up from the bottom on phones and centres on larger screens.
 * Escape closes it, focus moves into it and returns afterwards, and the page behind does not scroll.
 */
export default function Sheet({ title, onClose, children, size = "md", footer, headerExtra }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full flex-col overflow-hidden rounded-t-3xl border border-[#D3E3EF] bg-white shadow-2xl sm:rounded-3xl ${
          size === "lg" ? "h-[92dvh] max-w-5xl sm:h-[85vh]" : "max-h-[88dvh] max-w-md"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#D3E3EF] bg-[#F3F8FC] px-5 py-3">
          <h3 className="min-w-0 truncate text-sm font-black text-[#075985]">{title}</h3>
          <div className="flex shrink-0 items-center gap-2">
            {headerExtra}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D3E3EF] bg-white text-slate-600 hover:bg-sky-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-[#D3E3EF] bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </motion.div>
    </motion.div>
  );
}
