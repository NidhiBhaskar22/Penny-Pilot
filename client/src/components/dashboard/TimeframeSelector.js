// src/components/dashboard/TimeframeSelector.jsx
import React from "react";
import { Select, useColorModeValue } from "@chakra-ui/react";

export default function TimeframeSelector({
  timeframe,
  setTimeframe,
  w = "160px",
}) {
  // high-contrast tokens for both modes
  const fieldBg = useColorModeValue("white", "gray.700");
  const fieldText = useColorModeValue("gray.900", "whiteAlpha.900");
  const fieldBorder = useColorModeValue("gray.300", "whiteAlpha.400");
  const fieldBorderHov = useColorModeValue("gray.400", "whiteAlpha.500");
  const focusBorder = useColorModeValue("orange.500", "orange.300");
  const iconColor = useColorModeValue("gray.600", "whiteAlpha.900");

  return (
    <Select
      value={timeframe}
      onChange={(e) => setTimeframe(e.target.value)}
      w={w}
      variant="outline"
      bg={fieldBg}
      color={fieldText}
      borderColor={fieldBorder}
      _hover={{ borderColor: fieldBorderHov }}
      focusBorderColor={focusBorder}
      iconColor={iconColor}
      // make option text readable too (browser-dependent but helps)
      sx={{
        option: {
          color: fieldText,
          background: fieldBg,
        },
      }}
    >
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
      <option value="yearly">Yearly</option>
    </Select>
  );
}
