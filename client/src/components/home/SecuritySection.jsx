import { motion } from "framer-motion";
import {
  ShieldCheck,
  LockKeyhole,
  FolderLock,
  DatabaseZap,
  Fingerprint,
  Orbit,
} from "lucide-react";

const securityItems = [
  {
    title: "Secure authentication flow",
    icon: ShieldCheck,
    shape: "rounded-[28px_28px_28px_52px]",
  },
  {
    title: "Private account-scoped data access",
    icon: LockKeyhole,
    shape: "rounded-[52px_28px_28px_28px]",
  },
  {
    title: "Clear separation between app and public pages",
    icon: FolderLock,
    shape: "rounded-[28px_52px_28px_28px]",
  },
  {
    title: "Production deployment with managed backend and database",
    icon: DatabaseZap,
    shape: "rounded-[28px_28px_52px_28px]",
  },
];

export default function SecuritySection() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 pb-20 md:px-8">
      <div className="relative overflow-hidden rounded-[36px] border border-[#4f87df]/24 bg-[linear-gradient(160deg,rgba(5,14,44,0.94),rgba(4,10,22,0.84))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:p-10">
        <div className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-teal/8 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-10 h-40 w-40 rounded-full bg-cyan-300/8 blur-3xl" />

        <div className="grid gap-10 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="relative">
            <div className="text-sm font-bold uppercase tracking-[0.28em] text-peach">
              Privacy and Access
            </div>
            <h2 className="mt-4 max-w-2xl text-3xl font-black leading-[0.96] text-mist md:text-5xl">
              Personal finance data should stay personal.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-mist/72">
              Penny-Pilot uses account-based access and authenticated routes so
              your financial records remain scoped to your session and your
              account.
            </p>

            <div className="mt-10 flex items-center gap-8">
              <motion.div
                className="relative flex h-24 w-24 items-center justify-center rounded-full border border-teal/20 bg-[radial-gradient(circle,rgba(113,221,210,0.16),rgba(8,20,66,0.88)_72%)]"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Orbit className="h-9 w-9 text-teal" strokeWidth={1.8} />
                <div className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-teal shadow-[0_0_14px_rgba(113,221,210,0.75)]" />
              </motion.div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-mist/66">
                  <Fingerprint className="h-4 w-4 text-peach" strokeWidth={2} />
                  Authenticated scope
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-mist/66">
                  <ShieldCheck className="h-4 w-4 text-teal" strokeWidth={2} />
                  Session-bound access
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {securityItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.title}
                  className={`group relative overflow-hidden border border-white/10 bg-[rgba(8,20,66,0.5)] p-5 backdrop-blur-sm ${item.shape}`}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
                  whileHover={{ y: -5, borderColor: "rgba(113,221,210,0.28)" }}
                >
                  <div className="pointer-events-none absolute -right-10 top-0 h-24 w-24 rounded-full bg-white/5 blur-2xl transition-transform duration-300 group-hover:scale-125" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-teal/16 bg-teal/10">
                        <Icon className="h-5 w-5 text-teal" strokeWidth={2} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.24em] text-mist/38">
                        0{index + 1}
                      </span>
                    </div>

                    <div className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] leading-7 text-mist/82">
                      {item.title}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
