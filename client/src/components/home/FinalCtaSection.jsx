import { motion } from "framer-motion";
import { Link as RouterLink } from "react-router-dom";

export default function FinalCtaSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-10 md:px-8">
      <motion.div
        className="relative overflow-hidden rounded-[32px] border border-teal/30 bg-[linear-gradient(160deg,rgba(12,45,64,0.95),rgba(7,18,60,0.88))] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-12"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <motion.div
          className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-peach/10 blur-3xl"
          animate={{ x: [0, 18, 0], y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -right-10 bottom-8 h-44 w-44 rounded-full bg-teal/12 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, 12, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute left-1/2 top-0 h-px w-28 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent"
          animate={{ opacity: [0.35, 1, 0.35], scaleX: [0.9, 1.15, 0.9] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10">
          <div className="text-sm font-bold uppercase tracking-[0.28em] text-sand">
            Final Call
          </div>
          <h2 className="mt-4 text-3xl font-black text-mist md:text-5xl">
            Start building better financial habits.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-mist/78">
            Replace scattered notes and delayed decisions with a system that
            shows where money is, where it is leaking, and what needs attention
            next.
          </p>

          <motion.div
            className="mt-8 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, delay: 0.12, ease: "easeOut" }}
          >
            <RouterLink
              to="/dashboard"
              className="rounded-xl bg-peach px-8 py-3 text-sm font-black text-brand-900 shadow-[0_18px_40px_rgba(248,191,118,0.22)] transition-transform hover:scale-[1.03]"
            >
              Get Started
            </RouterLink>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
