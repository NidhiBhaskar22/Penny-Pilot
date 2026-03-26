import React, { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

const logoMark = "/favicon.svg";

const descriptors = [
  { label: "Track", className: "splash-word--track" },
  { label: "Budget", className: "splash-word--budget" },
  { label: "Analyze", className: "splash-word--analyze" },
  { label: "Grow", className: "splash-word--grow" },
];

function shuffleIndices(length) {
  const indices = Array.from({ length }, (_, index) => index);

  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }

  return indices;
}

function isSameOrder(a, b) {
  return a.every((value, index) => value === b[index]);
}

function buildRandomOrders(length, count) {
  const orders = [];
  let previous = Array.from({ length }, (_, index) => index);

  while (orders.length < count) {
    const next = shuffleIndices(length);

    if (isSameOrder(next, previous)) {
      continue;
    }

    orders.push(next);
    previous = next;
  }

  return orders;
}

const SplashScreen = ({ onComplete }) => {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const wordRefs = useRef([]);
  const brandRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const words = wordRefs.current.filter(Boolean);
      const stage = stageRef.current;
      const brand = brandRef.current;
      const root = rootRef.current;

      if (!words.length || !stage || !brand || !root) {
        onComplete?.();
        return;
      }

      const randomOrders = buildRandomOrders(words.length, 4);
      const rotations = [
        [-8, 7, -10, 9],
        [10, -8, 6, -11],
        [-6, 11, -7, 5],
        [0, 0, 0, 0],
      ];

      words.forEach((word, index) => {
        word.dataset.slot = String(index);
      });

      gsap.set(words, {
        autoAlpha: 0,
        y: 24,
        scale: 0.96,
        filter: "blur(6px)",
      });
      gsap.set(brand, {
        autoAlpha: 0,
        scale: 0.88,
        y: 20,
      });

      const timeline = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => {
          onComplete?.();
        },
      });

      timeline.to(words, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.65,
        stagger: 0.08,
      });

      randomOrders.forEach((order, stepIndex) => {
        timeline.add(() => {
          const state = Flip.getState(words);

          words.forEach((word, index) => {
            word.dataset.slot = String(order[index]);
          });

          Flip.from(state, {
            absolute: true,
            duration: stepIndex === 2 ? 0.8 : 0.92,
            ease: "power2.inOut",
            stagger: 0.04,
            scale: true,
          });

          gsap.to(words, {
            rotation: index => rotations[stepIndex][index],
            duration: stepIndex === 2 ? 0.8 : 0.92,
            stagger: 0.04,
            ease: "power2.inOut",
          });
        }, stepIndex === 0 ? "+=0.18" : "+=0.08");
      });

      timeline.add(() => {
        const state = Flip.getState(words);
        stage.classList.add("splash-word-stage--stacked");

        words.forEach((word, index) => {
          word.dataset.slot = String(index);
        });

        Flip.from(state, {
          absolute: true,
          duration: 0.95,
          ease: "power2.inOut",
          stagger: 0.04,
          scale: true,
        });
      }, "+=0.08");

      timeline.to(
        words,
        {
          autoAlpha: 0,
          scale: 0.84,
          filter: "blur(10px)",
          duration: 0.42,
          stagger: 0.04,
        },
        "+=0.03"
      );

      timeline.to(
        brand,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.72,
        },
        "-=0.06"
      );

      timeline.to(root, {
        autoAlpha: 0,
        duration: 0.68,
        delay: 0.55,
      });
    }, rootRef);

    return () => {
      ctx.revert();
    };
  }, [onComplete]);

  return (
    <div
      ref={rootRef}
      className="splash-screen fixed inset-0 z-[200] flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="splash-screen__backdrop" />
      <div className="splash-screen__grain" />

      <div className="splash-screen__content">
        <div ref={stageRef} className="splash-word-stage">
          {descriptors.map((word, index) => (
            <div
              key={word.label}
              ref={(node) => {
                wordRefs.current[index] = node;
              }}
              data-slot={index}
              className={`splash-word splash-word--${index + 1} ${word.className}`}
            >
              {word.label}
            </div>
          ))}
        </div>

        <div ref={brandRef} className="splash-brand">
          <div className="splash-brand__mark-wrap">
            <img src={logoMark} alt="PennyPilot logo" className="splash-brand__mark" />
          </div>
          <div className="splash-brand__copy">
            <div className="splash-brand__eyebrow">Finance Command Center</div>
            <div className="splash-brand__name">PennyPilot</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
