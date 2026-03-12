import { motion } from "framer-motion";
import { fadeUp, featureCards } from "./content";

export default function FeaturesSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-20 md:px-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.28em] text-peach">
            Core Features
          </div>
          <h2 className="mt-4 text-3xl font-black text-mist md:text-4xl">
            Built for control, not just record-keeping.
          </h2>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {featureCards.map((card, index) => (
          <motion.div
            key={card.title}
            className="rounded-[24px] border border-[#3a63b5]/35 bg-[linear-gradient(160deg,rgba(4,12,46,0.92),rgba(7,18,60,0.72))] p-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            custom={index}
          >
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-teal">
              Feature {String(index + 1).padStart(2, "0")}
            </div>
            <h3 className="mt-4 text-2xl font-black text-mist">{card.title}</h3>
            <p className="mt-4 text-base leading-7 text-mist/72">{card.copy}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
