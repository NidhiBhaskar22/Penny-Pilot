import { trustItems } from "./content";

export default function TrustBarSection() {
  return (
    <section className="border-y border-white/8 bg-[rgba(5,11,28,0.72)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-3 px-6 py-5 md:px-8">
        {trustItems.map((item) => (
          <span
            key={item}
            className="rounded-full border border-[#4f87df]/25 bg-[rgba(8,20,66,0.55)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-mist/72"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
