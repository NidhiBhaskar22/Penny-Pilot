// src/components/income/IncomeList.jsx
import React from "react";
import {
  Box,
  HStack,
  Text,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { Edit2, Trash2 } from "lucide-react";

export default function IncomeList({ incomes, onEdit, onDelete }) {
  // ✅ hooks at the top level only
  const cardBg = useColorModeValue("gray.50", "gray.800");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const subColor = useColorModeValue("gray.600", "gray.400");
  const rowBorder = useColorModeValue("gray.200", "gray.700");
  const rowHoverBg = useColorModeValue("gray.100", "gray.700");

  return (
    <Box>
      {(!incomes || incomes.length === 0) && (
        <Text color={subColor} p={4}>
          No incomes added yet.
        </Text>
      )}

      {incomes?.map((inc) => (
        <HStack
          key={inc._id}
          justify="space-between"
          p={4}
          borderBottom="1px solid"
          borderColor={rowBorder} // ⬅️ uses precomputed value
          bg={cardBg}
          _hover={{ bg: rowHoverBg }} // ⬅️ uses precomputed value
        >
          {/* Left side info */}
          <Box>
            <Text fontWeight="bold" color={textColor}>
              {inc.source || "Income"}
            </Text>
            <Text color={subColor}>
              Amount: ₹{Number(inc.amount || 0).toLocaleString("en-IN")}
            </Text>
            <Text color={subColor}>
              Date:{" "}
              {inc.date
                ? new Date(inc.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </Text>
          </Box>

          {/* Right side actions */}
          <HStack spacing={2}>
            <IconButton
              size="sm"
              aria-label="Edit"
              icon={<Edit2 size={16} />}
              onClick={() => onEdit(inc)}
              variant="ghost"
            />
            <IconButton
              size="sm"
              aria-label="Delete"
              colorScheme="red"
              icon={<Trash2 size={16} />}
              onClick={() => onDelete(inc.id)}
              variant="solid"
            />
          </HStack>
        </HStack>
      ))}
    </Box>
  );
}
