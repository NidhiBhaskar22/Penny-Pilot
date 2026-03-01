import React from "react";
import { motion } from "framer-motion";

const MBox = motion.div;

export default function AmbientTechBg({
  hue = 28,
  intensity = 0.14,
}) {
  const isLight = false;

  const glowA = `hsla(${hue}, 100%, ${isLight ? 60 : 50}%, ${intensity})`;
  const glowB = `hsla(${(hue + 80) % 360}, 100%, ${
    isLight ? 62 : 55
  }%, ${intensity})`;
  const glowC = `hsla(${(hue + 200) % 360}, 100%, ${
    isLight ? 65 : 60
  }%, ${intensity})`;

  const bgSolid = "#0b0d12";
  const gridColor = "rgba(255,255,255,0.06)";
  const majorGrid = "rgba(255,255,255,0.10)";
  const scanline = "rgba(255,255,255,0.04)";
  const noiseOpacity = 0.04;
  const noiseSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#n)" opacity="1" />
    </svg>
  `)}`;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: bgSolid }} />

      <MBox
        className="absolute -inset-[20%] blur-[30px]"
        style={{
          background: `
            radial-gradient(40% 30% at 20% 30%, ${glowA} 0%, transparent 60%),
            radial-gradient(35% 28% at 80% 20%, ${glowB} 0%, transparent 60%),
            radial-gradient(50% 40% at 50% 85%, ${glowC} 0%, transparent 65%)
          `,
        }}
        animate={{ x: [0, 20, -10, 0], y: [0, -10, 15, 0] }}
        transition={{ duration: 24, ease: "easeInOut", repeat: Infinity }}
      />

      <MBox
        className="absolute inset-0 opacity-40 mix-blend-screen"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 2px,
            ${scanline} 3px
          )`,
        }}
        animate={{ y: ["0%", "100%"] }}
        transition={{ duration: 10, ease: "linear", repeat: Infinity }}
      />

      <MBox
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(transparent, transparent),
            repeating-linear-gradient(90deg, ${gridColor} 0, ${gridColor} 1px, transparent 1px, transparent 24px),
            repeating-linear-gradient(0deg, ${gridColor} 0, ${gridColor} 1px, transparent 1px, transparent 24px)
          `,
          maskImage:
            "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0.9), rgba(0,0,0,0.2))",
          WebkitMaskImage:
            "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0.9), rgba(0,0,0,0.2))",
        }}
        animate={{
          backgroundPosition: [
            "0px 0px, 0px 0px, 0px 0px",
            "0px 0px, 24px 0px, 0px 24px",
          ],
        }}
        transition={{ duration: 18, ease: "linear", repeat: Infinity }}
      />

      <MBox
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `
            repeating-linear-gradient(90deg, ${majorGrid} 0, ${majorGrid} 2px, transparent 2px, transparent 120px),
            repeating-linear-gradient(0deg, ${majorGrid} 0, ${majorGrid} 2px, transparent 2px, transparent 120px)
          `,
          maskImage:
            "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0.7), rgba(0,0,0,0))",
          WebkitMaskImage:
            "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0.7), rgba(0,0,0,0))",
        }}
        animate={{
          backgroundPosition: ["0px 0px, 0px 0px", "-60px 0px, 0px -60px"],
        }}
        transition={{ duration: 40, ease: "linear", repeat: Infinity }}
      />

      <div
        className="absolute -inset-2 pointer-events-none mix-blend-screen"
        style={{
          backgroundImage: `url("${noiseSvg}")`,
          opacity: noiseOpacity,
        }}
      />
    </div>
  );
}
