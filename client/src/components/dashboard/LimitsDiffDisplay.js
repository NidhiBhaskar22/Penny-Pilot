import React from "react";
import { Box, Text, VStack, useColorModeValue } from "@chakra-ui/react";

const LimitsDiffDisplayByCategory = ({ differences = [] }) => {
  const cardBg = useColorModeValue("white", "gray.800");
  const cardBorder = useColorModeValue("gray.200", "whiteAlpha.300");
  const titleColor = useColorModeValue("green.700", "green.200");
  const bodyColor = useColorModeValue("gray.800", "gray.100");
  const sectionLine = useColorModeValue("gray.200", "whiteAlpha.200");
  const labelColor = useColorModeValue("gray.700", "gray.300");
  const posColor = useColorModeValue("green.600", "green.300");
  const negColor = useColorModeValue("red.600", "red.300");

  const fmt = (n) => Number(n ?? 0).toLocaleString("en-IN");

  return (
    <Box
      p={4}
      bg={cardBg}
      color={bodyColor}
      borderWidth={1}
      borderColor={cardBorder}
      borderRadius="md"
      maxW="480px"
    >
      <Text fontWeight="extrabold" mb={3} color={titleColor} fontSize="lg">
        Difference from Limits by Category
      </Text>

      <VStack spacing={3} align="stretch">
        {differences.length === 0 ? (
          <Text color={labelColor}>No category differences to display.</Text>
        ) : (
          differences.map(
            ({ category, monthlyDiff, weeklyDiff, dailyDiff }) => (
              <Box
                key={category || "Uncategorized"}
                pb={3}
                borderBottom="1px solid"
                borderColor={sectionLine}
              >
                <Text fontWeight="semibold" color={labelColor} mb={1}>
                  {category || "Uncategorized"}
                </Text>
                <Text color={(monthlyDiff ?? 0) >= 0 ? posColor : negColor}>
                  Monthly Diff: {fmt(monthlyDiff)}
                </Text>
                <Text color={(weeklyDiff ?? 0) >= 0 ? posColor : negColor}>
                  Weekly Diff: {fmt(weeklyDiff)}
                </Text>
                <Text color={(dailyDiff ?? 0) >= 0 ? posColor : negColor}>
                  Daily Diff: {fmt(dailyDiff)}
                </Text>
              </Box>
            )
          )
        )}
      </VStack>
    </Box>
  );
};

export default LimitsDiffDisplayByCategory;
