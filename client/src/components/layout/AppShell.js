import React, { useState } from "react";
import { Box, useColorModeValue } from "@chakra-ui/react";
import Sidebar from "../layout/Sidebar";

function TechBg() {
  const isLight = useColorModeValue(true, false);
  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={0}
      pointerEvents="none"
      overflow="hidden"
    >
      <Box
        position="absolute"
        inset={0}
        bg={useColorModeValue("#faf8f3", "#0b0d12")}
      />
      {/* drifting orbs */}
      <Box
        position="absolute"
        inset="-20%"
        filter="blur(30px)"
        opacity={isLight ? 0.18 : 0.22}
        animation="orbs 22s ease-in-out infinite"
        sx={{
          "@keyframes orbs": {
            "0%": { transform: "translate3d(0,0,0)" },
            "50%": { transform: "translate3d(16px,-14px,0)" },
            "100%": { transform: "translate3d(0,0,0)" },
          },
          background: `
            radial-gradient(35% 28% at 20% 25%, hsla(28,100%,60%,.35), transparent 60%),
            radial-gradient(35% 28% at 80% 20%, hsla(180,100%,60%,.32), transparent 60%),
            radial-gradient(45% 35% at 50% 85%, hsla(260,100%,60%,.30), transparent 65%)
          `,
        }}
      />
      {/* subtle scanlines */}
      <Box
        position="absolute"
        inset={0}
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent 0px, transparent 2px, ${
              isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)"
            } 3px
          )`,
          mixBlendMode: isLight ? "multiply" : "screen",
          opacity: 0.4,
        }}
      />
      {/* light grid */}
      <Box
        position="absolute"
        inset={0}
        opacity={isLight ? 0.1 : 0.12}
        style={{
          backgroundImage: `
            repeating-linear-gradient(90deg, rgba(0,0,0,.12) 0 1px, transparent 1px 26px),
            repeating-linear-gradient(0deg, rgba(0,0,0,.12) 0 1px, transparent 1px 26px)
          `,
          maskImage:
            "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,.9), rgba(0,0,0,0))",
        }}
      />
    </Box>
  );
}

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarW = collapsed ? 76 : 260;

  return (
    <Box minH="100vh" position="relative">
      <TechBg />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      {/* content area */}
      <Box
        position="relative"
        zIndex={1}
        ml={`${sidebarW}px`}
        transition="margin .2s ease"
        px={{ base: 4, md: 8 }}
        py={{ base: 6, md: 10 }}
      >
        {children}
      </Box>
    </Box>
  );
}
