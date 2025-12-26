import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";

function useOnScreen(
  ref,
  { root = null, rootMargin = "0px", threshold = 0.1 } = {}
) {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return; // SSR guard
    if (!ref?.current) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIntersecting(true);
          obs.unobserve(entry.target); // fire once
        }
      },
      { root, rootMargin, threshold }
    );

    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, root, rootMargin, threshold]);

  return isIntersecting;
}

const LazyShow = ({
  children,
  initial = { opacity: 0, x: -50 },
  animateTo = { x: 0, opacity: 1 },
}) => {
  const controls = useAnimation();
  const rootRef = useRef(null);
  const onScreen = useOnScreen(rootRef, {
    threshold: 0.1,
    rootMargin: "0px 0px -10% 0px",
  });

  useEffect(() => {
    if (onScreen) {
      controls.start({
        ...animateTo,
        transition: { duration: 0.5, ease: "easeOut" },
      });
    }
  }, [onScreen, controls, animateTo]);

  return (
    <motion.div ref={rootRef} initial={initial} animate={controls}>
      {children}
    </motion.div>
  );
};

export default LazyShow;
