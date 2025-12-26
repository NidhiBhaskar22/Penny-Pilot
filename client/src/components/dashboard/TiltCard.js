import React, { useRef } from "react";
import { Box, useColorModeValue } from "@chakra-ui/react";
import { motion } from "framer-motion";

const MBox = motion(Box);

export default function TiltCard({ children, ...props }) {
  const ref = useRef(null);
  const bg = useColorModeValue("whiteAlpha.800", "whiteAlpha.100");
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--rx", `${(py - 0.5) * -6}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 6}deg`);
  };

  const reset = (e) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  };

  return (
    <MBox
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{
        transform: "perspective(800px) rotateX(var(--rx)) rotateY(var(--ry))",
      }}
      transition="transform .1s ease"
      bg={bg}
      border="1px solid"
      borderColor={border}
      rounded="2xl"
      boxShadow="xl"
      p={8}
      {...props}
    >
      {children}
    </MBox>
  );
}
