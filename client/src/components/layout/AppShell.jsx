import React, { useState } from "react";
import Sidebar from "../layout/Sidebar";
import bgAuth from "../../assests/bg_auth.jpg";

function TechBg() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgAuth})` }}
      /> */}
      <div className="absolute inset-0 bg-[rgba(1,5,35,0.75)]" />
      {/* cool light bloom */}
      <div
        className="absolute -inset-[12%] blur-[32px] opacity-65"
        style={{
          animation: "orbs 22s ease-in-out infinite",
          background: `
            radial-gradient(42% 30% at 22% 26%, rgba(0,195,255,0.26), transparent 62%),
            radial-gradient(36% 28% at 78% 14%, rgba(58,145,255,0.2), transparent 60%),
            radial-gradient(44% 32% at 52% 88%, rgba(170,108,255,0.2), transparent 66%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-35 mix-blend-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(180,220,255,.05) 3px)",
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(90,150,255,.12) 0 1px, transparent 1px 36px), repeating-linear-gradient(0deg, rgba(90,150,255,.09) 0 1px, transparent 1px 36px)",
          maskImage:
            "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,.9), rgba(0,0,0,0))",
        }}
      />
    </div>
  );
}

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarW = collapsed ? 76 : 260;

  return (
    <div className="relative min-h-screen">
      <TechBg />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      {/* content area */}
      <div
        className="relative z-[1] transition-[margin] duration-200 ease-out px-4 py-6 md:px-8 md:py-10"
        style={{ marginLeft: `${sidebarW}px` }}
      >
        {children}
      </div>
    </div>
  );
}
