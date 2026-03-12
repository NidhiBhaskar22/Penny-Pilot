import { motion } from "framer-motion";
import { GraduationCap, BriefcaseBusiness, House } from "lucide-react";
import { useCases } from "./content";

const audienceVisuals = {
  Students: {
    accent: "text-peach",
    iconBg: "bg-peach/12",
    iconBorder: "border-peach/20",
    icon: GraduationCap,
    index: "01",
  },
  Professionals: {
    accent: "text-teal",
    iconBg: "bg-teal/12",
    iconBorder: "border-teal/20",
    icon: BriefcaseBusiness,
    index: "02",
  },
  Households: {
    accent: "text-cyan-300",
    iconBg: "bg-cyan-300/12",
    iconBorder: "border-cyan-300/20",
    icon: House,
    index: "03",
  },
};

export default function UseCasesSection() {
  return (
    <section className="mx-auto max-w-[1260px] px-6 pb-20 md:px-8">
      <div className="grid gap-10 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.28em] text-peach">
            Use Cases
          </div>
          <h2 className="mt-4 max-w-2xl text-3xl font-black leading-[0.95] text-mist md:text-5xl">
            Built for different financial rhythms.
          </h2>
          <p className="mt-8 max-w-xl text-base leading-8 text-mist/64">
            Penny-Pilot adapts to personal budgets, career cash flow, and
            household planning without flattening everything into the same
            view.
          </p>
        </div>

        <div className="grid gap-8 xl:pl-8">
          {useCases.map((item, index) => {
            const visual = audienceVisuals[item.audience] || audienceVisuals.Students;
            const Icon = visual.icon;

            return (
              <motion.div
                key={item.audience}
                className="group flex items-start gap-5 border-b border-white/8 pb-8 last:border-b-0 last:pb-0"
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${visual.iconBorder} ${visual.iconBg} transition-transform duration-300 group-hover:-translate-y-1`}
                >
                  <Icon className={`h-6 w-6 ${visual.accent}`} strokeWidth={2} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.26em] text-mist/40">
                      {visual.index}
                    </span>
                    <span className={`text-xl font-black uppercase tracking-[0.12em] ${visual.accent}`}>
                      {item.audience}
                    </span>
                  </div>

                  <p className="mt-4 max-w-[46ch] text-[15px] leading-7 text-mist/70">
                    {item.copy}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
