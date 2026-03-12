import Logo from "../../assests/PennyPilot.png";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp } from "./content";

const MotionSection = motion.section;

export default function HeroSection() {
  return (
    <MotionSection
      className="mx-auto grid max-w-[1200px] gap-12 px-6 pb-16 pt-6 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:pb-24"
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col justify-center">
        <motion.div
          className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#4f87df]/35 bg-[rgba(8,20,66,0.72)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-mist/75"
          variants={fadeUp}
          custom={0}
        >
          Personal Finance Command Center
        </motion.div>

        <motion.h1
          className="max-w-3xl text-5xl font-black leading-[0.95] text-mist md:text-7xl"
          variants={fadeUp}
          custom={1}
        >
          Track every rupee. Plan every move.
        </motion.h1>

        <motion.p
          className="mt-6 max-w-2xl text-base leading-7 text-mist/78 md:text-lg"
          variants={fadeUp}
          custom={2}
        >
          Penny-Pilot gives you one place to monitor spending, balances,
          investments, loans, EMIs, categories, and goals so your money
          decisions stop depending on memory.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-wrap gap-4"
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
      </div>

      <motion.div
        className="relative rounded-[28px] border border-[#4f87df]/28 bg-[linear-gradient(160deg,rgba(6,17,54,0.92),rgba(6,10,26,0.78))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur"
        variants={fadeUp}
        custom={2}
      >
        <div className="absolute right-5 top-5 rounded-full bg-peach px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-brand-900">
          Live View
        </div>

        <div className="rounded-3xl border border-white/10 bg-[rgba(3,8,38,0.7)] p-4">
          <img
            src={Logo}
            alt="PennyPilot logo"
            className="mx-auto max-h-[120px] rounded-2xl"
            draggable={false}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#3a63b5]/35 bg-[rgba(7,18,60,0.62)] p-4">
            <div className="text-[11px] uppercase tracking-[0.24em] text-mist/55">
              Monthly pulse
            </div>
            <div className="mt-2 text-3xl font-black text-mist">Stable</div>
            <div className="mt-2 text-sm text-mist/65">
              Income, expenses, and commitments aligned in one view.
            </div>
          </div>

          <div className="rounded-2xl border border-[#3a63b5]/35 bg-[rgba(7,18,60,0.62)] p-4">
            <div className="text-[11px] uppercase tracking-[0.24em] text-mist/55">
              Budget pressure
            </div>
            <div className="mt-2 text-3xl font-black text-peach">Visible</div>
            <div className="mt-2 text-sm text-mist/65">
              Spot category spikes before they swallow next month.
            </div>
          </div>

          <div className="rounded-2xl border border-[#3a63b5]/35 bg-[rgba(7,18,60,0.62)] p-4 sm:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-mist/55">
                  Planning stack
                </div>
                <div className="mt-2 text-lg font-bold text-mist">
                  Goals, EMIs, loans, investments
                </div>
              </div>
              <div className="rounded-full bg-teal px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-mist">
                Actionable
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </MotionSection>
  );
}
