import { useEffect, useState } from "react";
import { useMotionValue, useSpring, animate } from "framer-motion";
import { Box } from "@chakra-ui/react";

export default function AnimatedNumber({
  value = 0,
  duration = 0.6,
  format = (v) => v.toLocaleString("en-IN"),
  ...props
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 20, stiffness: 120 });
  const [display, setDisplay] = useState(0);

  // Re-render when the spring changes
  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      setDisplay(Math.round(v));
    });
    return () => unsub();
  }, [spring]);

  // Animate to the next value
  useEffect(() => {
    const target = Number(value) || 0;
    const controls = animate(mv, target, { duration, ease: "easeOut" });
    return () => controls.stop();
  }, [value, duration, mv]);

  return (
    <Box as="span" {...props}>
      {format(Number(display) || 0)}
    </Box>
  );
}
