import React from "react";
import {
  Box,
  HStack,
  Text,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { Edit2, Trash2 } from "lucide-react";

// robust date pick + format (spentAt | date | createdAt)
function fmtDate(exp) {
  const raw = exp?.spentAt ?? exp?.date ?? exp?.createdAt;
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ExpenseList({ expenses, onEdit, onDelete }) {
  // hooks at top-level (for ESLint)
  const rowBg = useColorModeValue("gray.50", "gray.800");
  const rowHoverBg = useColorModeValue("gray.100", "gray.700");
  const rowBorder = useColorModeValue("gray.200", "gray.700");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const subColor = useColorModeValue("gray.600", "gray.400");

  if (!expenses || expenses.length === 0) {
    return (
      <Text color={subColor} p={4}>
        No expenses added yet.
      </Text>
    );
  }

  return (
    <Box>
      {expenses.map((exp) => (
        <HStack
          key={exp.id}
          justify="space-between"
          p={4}
          borderBottom="1px solid"
          borderColor={rowBorder}
          bg={rowBg}
          _hover={{ bg: rowHoverBg }}
        >
          <Box>
            <Text fontWeight="bold" color={textColor}>
              {exp.category || exp.title || "Expense"}
            </Text>
            <Text color={subColor}>
              Amount: ₹{Number(exp.amount || 0).toLocaleString("en-IN")}
            </Text>
            <Text color={subColor}>Date: {fmtDate(exp)}</Text>
          </Box>

          <HStack spacing={2}>
            <IconButton
              size="sm"
              aria-label="Edit"
              icon={<Edit2 size={16} />}
              onClick={() => onEdit(exp)}
              variant="ghost"
            />
            <IconButton
              size="sm"
              aria-label="Delete"
              colorScheme="red"
              icon={<Trash2 size={16} />}
              onClick={() => onDelete(exp.id)} 
            />
          </HStack>
        </HStack>
      ))}
    </Box>
  );
}
