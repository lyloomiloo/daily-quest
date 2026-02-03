"use client";

interface CaptureButtonProps {
  onClick: () => void;
}

export default function CaptureButton({ onClick }: CaptureButtonProps) {
  return (
    <div
      className="w-full px-4 pb-8 pt-4 bg-background border-t-[4px] border-black"
      style={{ zIndex: 100 }}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full py-4 bg-foreground text-background font-mono text-sm uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        SNAPP
      </button>
    </div>
  );
}
