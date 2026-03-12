import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp } from "./content";

const MotionSection = motion.section;
const heroWords = ["Track", "every", "rupee.", "Plan", "every", "move."];

export default function HeroSection() {
  const [glowPosition, setGlowPosition] = useState({ x: 55, y: 42 });

  return (
    <MotionSection
      className="mx-auto max-w-max px-6 pb-16 pt-6 md:px-8 md:pb-24"
      initial="hidden"
      animate="visible"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        setGlowPosition({ x, y });
      }}
    >
      <div className="relative flex flex-col justify-center overflow-hidden ">
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[36px] opacity-70 blur-3xl"
          animate={{
            background: `radial-gradient(circle at ${glowPosition.x}% ${glowPosition.y}%, rgba(113,221,210,0.16), rgba(79,135,223,0.06) 22%, rgba(0,0,0,0) 52%)`,
          }}
          transition={{ duration: 0.25, ease: "linear" }}
        />
        <motion.div
          className="pointer-events-none absolute left-0 top-0 h-px w-40 bg-gradient-to-r from-transparent via-teal to-transparent"
          animate={{ x: [0, 220, 0], opacity: [0.25, 0.95, 0.25] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="relative z-10 mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#4f87df]/35 bg-[rgba(8,20,66,0.72)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-mist/75"
          variants={fadeUp}
          custom={0}
        >
          Personal Finance Command Center
        </motion.div>

        <div className="relative z-10 max-w-3xl text-5xl font-black leading-[0.95] text-mist md:text-7xl">
          {heroWords.map((word, index) => (
            <motion.span
              key={`${word}-${index}`}
              className="mr-[0.25em] inline-block"
              initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.55, delay: 0.12 + index * 0.07, ease: "easeOut" }}
            >
              {word}
            </motion.span>
          ))}
        </div>

        <motion.p
          className="relative z-10 mt-6 max-w-2xl text-base leading-7 text-mist/78 md:text-lg"
          variants={fadeUp}
          custom={2}
        >
          Penny-Pilot gives you one place to monitor spending, balances,
          investments, loans, EMIs, categories, and goals so your money
          decisions stop depending on memory.
        </motion.p>

        <motion.div
          className="relative z-10 mt-8 flex flex-wrap gap-4"
          variants={fadeUp}
          custom={3}
        >
          <RouterLink
            to="/register"
            className="rounded-xl bg-teal px-7 py-3 text-sm font-bold text-mist shadow-[0_16px_34px_rgba(17,100,102,0.35)] transition-transform hover:scale-[1.02]"
          >
            Get Started
          </RouterLink>
          <RouterLink
            to="/dashboard"
            className="rounded-xl border border-[#4f87df]/35 bg-[rgba(8,20,66,0.55)] px-7 py-3 text-sm font-bold text-mist/90 backdrop-blur transition-transform hover:scale-[1.02]"
          >
            See Dashboard
          </RouterLink>
        </motion.div>

        <motion.div
          className="relative z-10 mt-8 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-mist/48"
          variants={fadeUp}
          custom={4}
        >
          {["Budgets", "Investments", "EMIs", "Accounts"].map((item, index) => (
            <motion.span
              key={item}
              className="rounded-full border border-white/10 bg-[rgba(8,20,66,0.44)] px-3 py-1.5"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.22,
              }}
            >
              {item}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </MotionSection>
  );
}
