import React from "react";
import { Box, Heading, Text, VStack } from "@chakra-ui/react";

const SummaryCard = ({ title, amount, color = "gray.700" }) => {
  return (
    <Box
      p={6}
      borderWidth={1}
      borderRadius="md"
      boxShadow="sm"
      bg="white"
      w="100%"
      maxW="300px"
      textAlign="center"
    >
      <VStack spacing={2}>
        <Heading as="h3" size="md" color={color}>
          {title}
        </Heading>
        <Text fontSize="2xl" fontWeight="bold">
          {amount.toLocaleString()}
        </Text>
      </VStack>
    </Box>
  );
};

export default SummaryCard;
