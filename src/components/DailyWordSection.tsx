"use client";

interface DailyWordSectionProps {
  wordEn: string;
  wordEs: string;
}

export default function DailyWordSection({ wordEn, wordEs }: DailyWordSectionProps) {
  return (
    <div className="px-4 pt-2 pb-3 shrink-0 bg-background">
      <div
        className="font-mono text-[#888]"
        style={{ fontSize: "9px" }}
      >
        <span className="uppercase" style={{ letterSpacing: "0.12em" }}>
          word of the day
        </span>
      </div>
      <h1 className="text-[2.75rem] font-black uppercase tracking-tight text-foreground leading-tight mt-0.5">
        {wordEn}
      </h1>
      <p className="font-mono text-sm text-muted lowercase mt-0.5">
        [{wordEs}]
      </p>
    </div>
  );
}
