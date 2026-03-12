import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { workflowSteps } from "./content";

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

const desktopPositions = [
  "left-0 top-8",
  "left-1/2 top-52 -translate-x-1/2",
  "right-0 top-10",
];

export default function WorkflowSection() {
  const sectionRef = useRef(null);
  const pathRef = useRef(null);
  const pulseRef = useRef(null);
  const pulseHaloRef = useRef(null);
  const cardRefs = useRef([]);
  const dotRefs = useRef([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const path = pathRef.current;
    const pulse = pulseRef.current;
    const pulseHalo = pulseHaloRef.current;

    if (!section || !path || !pulse || !pulseHalo) {
      return undefined;
    }

    const cards = cardRefs.current.filter(Boolean);
    const dots = dotRefs.current.filter(Boolean);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      gsap.set(path, {
        strokeDasharray: path.getTotalLength(),
        strokeDashoffset: path.getTotalLength(),
      });
      gsap.set(cards, { opacity: 0, y: 36, scale: 0.96 });
      gsap.set(dots, { scale: 0, opacity: 0 });

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: {
          trigger: section,
          start: "top 72%",
          once: true,
        },
      });

      timeline.to(
        path,
        {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: "power2.inOut",
        },
        0
      );
      timeline.to(
        dots,
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          stagger: 0.16,
        },
        0.3
      );
      timeline.to(
        cards,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.18,
        },
        0.2
      );

      if (reduceMotion) {
        gsap.set([pulse, pulseHalo], { autoAlpha: 0 });
        return;
      }

      gsap.to([pulse, pulseHalo], {
        duration: 8,
        repeat: -1,
        ease: "none",
        motionPath: {
          path,
          align: path,
          alignOrigin: [0.5, 0.5],
          autoRotate: false,
        },
      });

      gsap.to(pulse, {
        scale: 1.15,
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(pulseHalo, {
        scale: 1.8,
        opacity: 0.18,
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="mx-auto max-w-[1200px] px-6 pb-20 md:px-8">
      <div className="text-sm font-bold uppercase tracking-[0.28em] text-peach">
        How It Works
      </div>
      <div className="mt-4 max-w-2xl text-base leading-7 text-mist/72">
        A guided money loop that starts with clean inputs, turns into visible
        patterns, and ends in deliberate action.
      </div>

      <div className="relative mt-10 hidden min-h-[470px] lg:block">
        <svg
          className="absolute inset-x-10 top-20 h-[250px] w-[calc(100%-5rem)]"
          viewBox="0 0 1000 260"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="workflowGlow" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(113,221,210,0.18)" />
              <stop offset="50%" stopColor="rgba(113,221,210,0.95)" />
              <stop offset="100%" stopColor="rgba(79,135,223,0.35)" />
            </linearGradient>
          </defs>

          <path
            d="M 30 120 C 170 10, 330 10, 500 130 S 820 250, 970 120"
            fill="none"
            stroke="rgba(79,135,223,0.14)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            ref={pathRef}
            d="M 30 120 C 170 10, 330 10, 500 130 S 820 250, 970 120"
            fill="none"
            stroke="url(#workflowGlow)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>

        <div
          ref={pulseHaloRef}
          className="absolute left-0 top-0 z-10 h-10 w-10 rounded-full bg-teal/20 blur-md"
        />
        <div
          ref={pulseRef}
          className="absolute left-0 top-0 z-20 h-5 w-5 rounded-full bg-teal shadow-[0_0_24px_rgba(113,221,210,0.85)]"
        >
          <div className="absolute inset-0 rounded-full border border-white/50" />
          <div className="absolute -inset-2 rounded-full bg-teal/20 blur-md" />
        </div>

        {workflowSteps.map((item, index) => (
          <div key={item.step} className={`absolute z-10 w-[31%] ${desktopPositions[index]}`}>
            <div
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="rounded-[28px] border border-[#3a63b5]/35 bg-[linear-gradient(160deg,rgba(4,12,46,0.96),rgba(7,18,60,0.8))] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-teal">
                    Step {item.step}
                  </div>
                  <h3 className="mt-4 text-2xl font-black text-mist">{item.title}</h3>
                </div>
                <div className="rounded-2xl border border-[#4f87df]/30 bg-[rgba(8,20,66,0.72)] px-3 py-2 text-sm font-black text-mist/80">
                  {item.step}
                </div>
              </div>
              <p className="mt-5 text-base leading-7 text-mist/72">{item.copy}</p>
            </div>

            <div
              ref={(el) => {
                dotRefs.current[index] = el;
              }}
              className={`absolute h-5 w-5 -translate-x-1/2 rounded-full border-4 border-[#08163f] bg-teal shadow-[0_0_24px_rgba(113,221,210,0.8)] ${
                index === 0
                  ? "left-[88%] top-[92%]"
                  : index === 1
                    ? "left-1/2 -bottom-10"
                    : "left-[12%] top-[92%]"
              }`}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:hidden">
        {workflowSteps.map((item) => (
          <div
            key={item.step}
            className="rounded-[24px] border border-[#3a63b5]/35 bg-[rgba(4,12,46,0.82)] p-6"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-teal">
              Step {item.step}
            </div>
            <h3 className="mt-4 text-2xl font-black text-mist">{item.title}</h3>
            <p className="mt-4 text-base leading-7 text-mist/72">{item.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
