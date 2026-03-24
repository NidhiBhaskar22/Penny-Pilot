import { trustItems } from "./content";

export default function TrustBarSection() {
  return (
    <section className="border-y border-[rgb(var(--pp-border-rgb)/0.16)] bg-[rgb(var(--pp-panel-rgb)/0.72)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-3 px-6 py-5 md:px-8">
        {trustItems.map((item) => (
          <span
            key={item}
            className="rounded-full border border-[#4f87df]/25 bg-[rgb(var(--pp-panel-soft-rgb)/0.55)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-mist/72"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

