import React from "react";
import { Box, Text, Stack, useTheme, useColorModeValue} from "@chakra-ui/react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

const BalanceCard = ({ current, lastWeek, lastMonth }) => {
  const theme = useTheme();
   const labelColor = useColorModeValue("gray.900", "whiteAlpha.900");
   // Prefer your custom primary if present; otherwise fall back to Chakra orange
   const valueColor = useColorModeValue(
     theme?.colors?.primary?.[700] || "orange.700",
     theme?.colors?.primary?.[300] || "orange.300"
   );
  return (
    <MotionBox
      bg={`linear-gradient(135deg, ${theme.colors.primary[50]}, ${theme.colors.background[100]})`}
      borderRadius="2xl"
      boxShadow="xl"
      p={8}
      border="1.5px solid"
      borderColor={theme.colors.primary[100]}
      minH="275px"
      display="flex"
      flexDirection="column"
      justifyContent="center"
    >
      <Text
        fontWeight="extrabold"
        fontSize="2xl"
        color={theme.colors.primary[500]}
        mb={6}
      >
        Balance
      </Text>
      <Stack spacing={2}>
        <Text fontWeight="bold" color={labelColor}>
          Current:&nbsp;
          <Box as="span" color={valueColor} fontWeight="extrabold">
            {current}
          </Box>
        </Text>
        <Text fontWeight="bold" color={theme.colors.primary[600]}>
          Last Week:&nbsp;
          <Box
            as="span"
            color={theme.colors.primary[500]}
            fontWeight="extrabold"
          >
            {lastWeek}
          </Box>
        </Text>
        <Text fontWeight="bold" color={theme.colors.green[600]}>
          Last Month:&nbsp;
          <Box as="span" color={theme.colors.green[500]} fontWeight="extrabold">
            {lastMonth}
          </Box>
        </Text>
      </Stack>
    </MotionBox>
  );
};

export default BalanceCard;
