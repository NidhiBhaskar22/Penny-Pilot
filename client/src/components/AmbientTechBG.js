// src/components/AmbientTechBg.jsx
import React from "react";
import { Box, useColorModeValue } from "@chakra-ui/react";
import { motion } from "framer-motion";

const MBox = motion(Box);

export default function AmbientTechBg({
  hue = 28, // base hue (28 ≈ orange to match PennyPilot)
  intensity = 0.14, // overall opacity cap for effects
}) {
  const isLight = useColorModeValue(true, false);

  // palette derived from hue
  const glowA = `hsla(${hue}, 100%, ${isLight ? 60 : 50}%, ${intensity})`;
  const glowB = `hsla(${(hue + 80) % 360}, 100%, ${
    isLight ? 62 : 55
  }%, ${intensity})`;
  const glowC = `hsla(${(hue + 200) % 360}, 100%, ${
    isLight ? 65 : 60
  }%, ${intensity})`;

  const bgSolid = useColorModeValue("#faf8f3", "#0b0d12");
  const gridColor = useColorModeValue(
    "rgba(0,0,0,0.06)",
    "rgba(255,255,255,0.06)"
  );
  const majorGrid = useColorModeValue(
    "rgba(0,0,0,0.10)",
    "rgba(255,255,255,0.10)"
  );
  const scanline = useColorModeValue(
    "rgba(0,0,0,0.05)",
    "rgba(255,255,255,0.04)"
  );
  const noiseOpacity = useColorModeValue(0.08, 0.04);

  return (
    <Box position="absolute" inset={0} overflow="hidden" zIndex={0} pointerEvents="none">
      {/* base */}
      <Box position="absolute" inset={0} bg={bgSolid} />

      {/* animated gradient blobs (parallax layers) */}
      <MBox
        position="absolute"
        inset="-20%"
        style={{
          background: `
            radial-gradient(40% 30% at 20% 30%, ${glowA} 0%, transparent 60%),
            radial-gradient(35% 28% at 80% 20%, ${glowB} 0%, transparent 60%),
            radial-gradient(50% 40% at 50% 85%, ${glowC} 0%, transparent 65%)
          `,
          filter: "blur(30px)",
        }}
        animate={{ x: [0, 20, -10, 0], y: [0, -10, 15, 0] }}
        transition={{ duration: 24, ease: "easeInOut", repeat: Infinity }}
      />

      {/* subtle scanlines */}
      <MBox
        position="absolute"
        inset={0}
        opacity={0.4}
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 2px,
            ${scanline} 3px
          )`,
          mixBlendMode: isLight ? "multiply" : "screen",
        }}
        animate={{ y: ["0%", "100%"] }}
        transition={{ duration: 10, ease: "linear", repeat: Infinity }}
      />

      {/* moving micro-grid (two layers to create moiré-free depth) */}
      <MBox
        position="absolute"
        inset={0}
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
      {/* major grid every 5 cells */}
      <MBox
        position="absolute"
        inset={0}
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
        opacity={0.5}
        animate={{
          backgroundPosition: ["0px 0px, 0px 0px", "-60px 0px, 0px -60px"],
        }}
        transition={{ duration: 40, ease: "linear", repeat: Infinity }}
      />

      {/* grain/noise overlay for texture */}
      <Box
        position="absolute"
        inset={-2}
        pointerEvents="none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,\
            <svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'>\
              <filter id='n'>\
                <feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/>\
                <feColorMatrix type='saturate' values='0'/>\
              </filter>\
              <rect width='100%' height='100%' filter='url(%23n)' opacity='1'/>\
            </svg>\")",
          opacity: noiseOpacity,
          mixBlendMode: isLight ? "multiply" : "screen",
        }}
      />
    </Box>
  );
}
