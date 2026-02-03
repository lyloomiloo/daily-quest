"use client";

interface HeaderProps {
  dateStr: string;
  countdown: string;
}

export default function Header({ dateStr, countdown }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-4 py-3 bg-background border-b border-black/10 shrink-0"
      style={{ zIndex: 100 }}
    >
      <span className="font-mono text-xs uppercase tracking-wider text-[#000]">
        {dateStr}
      </span>
      <span className="font-mono text-xs uppercase tracking-wider text-[#000] flex items-center gap-1.5">
        <span
          className="countdown-dot-blink w-1.5 h-1.5 rounded-full bg-[#000]"
          aria-hidden
        />
        RESETS IN <span className="lowercase">{countdown}</span>
      </span>
    </header>
  );
}
