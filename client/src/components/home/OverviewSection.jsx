import { motion } from "framer-motion";
import { fadeUp, overviewStats } from "./content";

const orbitItems = [
  {
    label: overviewStats[0].label,
    points: ["Income", "Expense", "Balance", "Investment"],
    className:
      "left-[18px] top-[128px] h-[266px] w-[266px] rounded-[50%_50%_56%_44%/46%_38%_62%_54%]",
    glowClass:
      "bg-[radial-gradient(circle_at_35%_30%,rgba(248,191,118,0.14),rgba(7,18,60,0.95)_72%)]",
    dotClass: "left-[270px] top-[260px]",
    contentClass: "max-w-[150px]",
  },
  {
    label: overviewStats[1].label,
    points: ["Goals", "Limits", "EMIs", "Loans"],
    className:
      "left-[364px] top-[12px] h-[214px] w-[268px] rounded-[999px]",
    glowClass:
      "bg-[radial-gradient(circle_at_50%_30%,rgba(113,221,210,0.16),rgba(7,18,60,0.95)_74%)]",
    dotClass: "left-[438px] top-[220px]",
    contentClass: "max-w-[168px]",
  },
  {
    label: overviewStats[2].label,
    points: ["Accounts", "Categories", "Payment Methods"],
    className:
      "left-[420px] top-[286px] h-[258px] w-[258px] rounded-[54%_46%_42%_58%/48%_60%_40%_52%]",
    glowClass:
      "bg-[radial-gradient(circle_at_65%_30%,rgba(79,135,223,0.2),rgba(7,18,60,0.95)_74%)]",
    dotClass: "left-[430px] top-[408px]",
    contentClass: "max-w-[174px]",
  },
];

export default function OverviewSection() {
  return (
    <section className="mx-auto max-w-[1380px] px-6 py-20 md:px-8">
      <div className="grid items-center gap-16 xl:grid-cols-[0.78fr_1.22fr]">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.28em] text-peach">
            Product Overview
          </div>
          <h2 className="mt-4 max-w-xl text-3xl font-black text-mist md:text-5xl">
            One home for the money story you are actually living.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-mist/72">
            Penny-Pilot is designed for people who need more than a ledger. It
            helps you understand where money is now, where it is headed, and
            which habits are shaping the outcome.
          </p>
        </div>

        <div className="relative min-h-[580px] overflow-hidden xl:overflow-visible">
          <div className="grid gap-5 xl:hidden">
            {orbitItems.map((item, index) => (
              <motion.div
                key={item.label}
                className={`flex flex-col border border-[#3a63b5]/30 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur ${item.glowClass} ${
                  index === 1 ? "rounded-[999px]" : "rounded-[30px]"
                }`}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                custom={index}
              >
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-mist/56">
                  {item.label}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.points.map((point) => (
                    <span
                      key={point}
                      className="rounded-full border border-white/10 bg-[rgba(8,20,66,0.48)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist/78"
                    >
                      {point}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="relative hidden h-[580px] w-[720px] xl:block">
            <div className="absolute left-[150px] top-[88px] h-[420px] w-[500px] rounded-[999px] border border-white/6" />
            <div className="absolute left-[182px] top-[124px] h-[348px] w-[432px] rounded-[999px] border border-[#3a63b5]/16" />

            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 720 580"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M 336 256 C 292 240, 252 234, 222 246"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1.5"
              />
              <path
                d="M 360 230 C 392 186, 432 154, 474 134"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1.5"
              />
              <path
                d="M 362 292 C 402 332, 430 364, 468 390"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1.5"
              />
            </svg>

            <div className="absolute left-[290px] top-[204px] z-20 flex h-[118px] w-[118px] items-center justify-center rounded-full border border-[#4f87df]/22 bg-[radial-gradient(circle,rgba(11,24,71,0.98),rgba(5,11,28,0.9))] text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-mist/50">
                  Unified
                </div>
                <div className="mt-2 text-lg font-black text-mist">Money OS</div>
              </div>
            </div>

            {orbitItems.map((item, index) => (
              <motion.div
                key={item.label}
                className={`absolute z-10 flex flex-col border border-[#3a63b5]/30 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur ${item.className} ${item.glowClass}`}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                custom={index}
                whileHover={{
                  y: -6,
                  scale: 1.015,
                  boxShadow: "0 24px 90px rgba(0,0,0,0.42)",
                }}
                transition={{ type: "spring", stiffness: 150, damping: 18 }}
              >
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-mist/56">
                  {item.label}
                </div>
                <div className={`mt-5 flex flex-wrap gap-2 ${item.contentClass}`}>
                  {item.points.map((point) => (
                    <span
                      key={point}
                      className="rounded-full border border-white/10 bg-[rgba(8,20,66,0.48)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist/78"
                    >
                      {point}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}

            {orbitItems.map((item) => (
              <span
                key={`${item.label}-dot`}
                className={`absolute z-20 h-3.5 w-3.5 rounded-full bg-teal shadow-[0_0_18px_rgba(113,221,210,0.8)] ${item.dotClass}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
