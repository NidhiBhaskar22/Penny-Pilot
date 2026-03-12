import { planningItems } from "./content";

export default function PlanningSection() {
  return (
    <section className="mx-auto grid max-w-[1200px] gap-6 px-6 pb-20 md:px-8 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[28px] border border-[#3a63b5]/35 bg-[rgba(6,16,52,0.76)] p-8">
        <div className="text-sm font-bold uppercase tracking-[0.28em] text-peach">
          Smart Planning
        </div>
        <h2 className="mt-4 text-3xl font-black text-mist md:text-4xl">
          Don&apos;t just record money. Direct it.
        </h2>
        <p className="mt-4 text-base leading-7 text-mist/72">
          Goals, limits, loans, and EMIs belong in the same conversation.
          Penny-Pilot keeps future obligations close to present behavior so
          planning stays grounded in reality.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {planningItems.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[#3a63b5]/35 bg-[rgba(7,18,60,0.62)] p-5 text-base font-semibold leading-7 text-mist"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
