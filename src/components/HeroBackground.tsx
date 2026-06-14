import type { CSSProperties } from "react";

// Streak config — generated at module level so it's stable (no per-render allocation)
const STREAKS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * 360;
  const colors = ["#c084fc", "#a855f7", "#818cf8", "#60a5fa", "#a855f7", "#c084fc"];
  const color = colors[i % colors.length];
  const dur = 1.8 + (i % 5) * 0.4;
  const delay = -(i * (dur / 18));
  const width = i % 4 === 0 ? 1 : i % 3 === 0 ? 2 : 1;
  const height = 28 + (i % 4) * 8; // vh units
  return { angle, color, dur, delay, width, height };
});

export default function HeroBackground() {
  return (
    <>
      <style>{`
        @keyframes hero-streak {
          0%   { transform: translate(-50%, 0) rotate(var(--ang)) scaleY(0.04); opacity: 0; }
          12%  { opacity: 0.9; }
          75%  { opacity: 0.6; }
          100% { transform: translate(-50%, 0) rotate(var(--ang)) scaleY(1.6); opacity: 0; }
        }
        @keyframes hero-glow-a {
          0%, 100% { opacity: 0.25; transform: translate(-50%, -55%) scale(1); }
          50%       { opacity: 0.40; transform: translate(-50%, -55%) scale(1.08); }
        }
        @keyframes hero-glow-b {
          0%, 100% { opacity: 0.18; transform: translate(-50%, -45%) scale(1); }
          50%       { opacity: 0.30; transform: translate(-50%, -45%) scale(1.06); }
        }
        .hs-streak {
          position: absolute;
          top: 50%; left: 50%;
          transform-origin: top center;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            var(--clr) 35%,
            var(--clr) 65%,
            transparent 100%
          );
          animation: hero-streak var(--dur) linear infinite var(--dly);
          will-change: transform, opacity;
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden bg-black">

        {/* Deep-space radial base */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 90% 70% at 50% 45%, #0d0920 0%, #050308 55%, #000 100%)" }}
        />

        {/* Purple glow — upper center */}
        <div
          className="absolute rounded-full blur-[100px]"
          style={{
            width: "65vw", height: "65vw",
            top: "50%", left: "50%",
            background: "radial-gradient(circle, #9333ea40 0%, transparent 70%)",
            animation: "hero-glow-a 5s ease-in-out infinite",
          } as CSSProperties}
        />

        {/* Blue glow — lower center */}
        <div
          className="absolute rounded-full blur-[80px]"
          style={{
            width: "45vw", height: "45vw",
            top: "55%", left: "50%",
            background: "radial-gradient(circle, #2563eb35 0%, transparent 70%)",
            animation: "hero-glow-b 7s ease-in-out infinite",
          } as CSSProperties}
        />

        {/* Light streaks radiating from center */}
        {STREAKS.map((s, i) => (
          <div
            key={i}
            className="hs-streak"
            style={{
              "--ang": `${s.angle}deg`,
              "--clr": s.color,
              "--dur": `${s.dur}s`,
              "--dly": `${s.delay}s`,
              width: `${s.width}px`,
              height: `${s.height}vh`,
              opacity: 0,
            } as CSSProperties}
          />
        ))}

        {/* Subtle perspective grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(168,85,247,0.8) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(168,85,247,0.8) 1px, transparent 1px)",
            backgroundSize: "70px 70px",
          }}
        />

        {/* Vignette bottom — blends into page */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none" />

      </div>
    </>
  );
}
