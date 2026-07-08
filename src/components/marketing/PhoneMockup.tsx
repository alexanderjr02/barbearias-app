import { ReactNode } from "react";

/**
 * A device frame drawn in CSS, not a screenshot — the actual mobile app
 * (mobile/) is Flutter and its real screens don't exist as static image
 * assets we can ship here. Recreating the layout keeps this honest (it
 * mirrors real screen structure/copy) without claiming a screenshot we
 * don't have.
 */
export function PhoneMockup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative w-[260px] sm:w-[290px] ${className}`}>
      <div className="absolute -inset-3 rounded-[3rem] bg-gradient-to-b from-[var(--mkt-gold)]/20 to-transparent blur-2xl" />
      <div className="relative rounded-[2.5rem] border border-[var(--mkt-border-strong)] bg-[#08070510] p-2.5 shadow-2xl shadow-black/60">
        <div className="rounded-[2rem] bg-[var(--mkt-bg)] overflow-hidden border border-white/5">
          {/* Notch */}
          <div className="relative h-7 flex items-center justify-center bg-[var(--mkt-bg)]">
            <div className="w-24 h-4 rounded-full bg-black" />
          </div>
          <div className="h-[520px] overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}
