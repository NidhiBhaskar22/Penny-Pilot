import React, { useRef } from "react";
import { motion } from "framer-motion";

const MBox = motion.div;

export default function TiltCard({ children, className = "", ...props }) {
  const ref = useRef(null);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--rx", `${(py - 0.5) * -6}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 6}deg`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  };

  return (
    <MBox
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={`relative overflow-hidden rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-8 text-mist shadow-[0_14px_40px_rgba(0,0,0,0.55),0_0_30px_rgba(0,170,255,0.18)] backdrop-blur ${className}`}
      style={{
        transform: "perspective(800px) rotateX(var(--rx)) rotateY(var(--ry))",
        transition: "transform .1s ease, box-shadow .2s ease",
      }}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(72,216,255,0.45), rgba(74,130,255,0.26), rgba(153,135,255,0.22))",
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1px",
          borderRadius: "inherit",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(120px 80px at 20% 10%, rgba(0,195,255,0.22), transparent 70%)",
        }}
      />
      {children}
    </MBox>
  );
}
