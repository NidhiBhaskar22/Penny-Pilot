import React from "react";
import {
  Box,
  HStack,
  Text,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { Edit2, Trash2 } from "lucide-react";

function fmtDate(inv) {
  const raw = inv?.investedAt ?? inv?.date ?? inv?.createdAt;
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InvestmentList({ investments, onEdit, onDelete }) {
  const rowBg = useColorModeValue("gray.50", "gray.800");
  const rowHoverBg = useColorModeValue("gray.100", "gray.700");
  const rowBorder = useColorModeValue("gray.200", "gray.700");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const subColor = useColorModeValue("gray.600", "gray.400");

  if (!investments || investments.length === 0) {
    return (
      <Text color={subColor} p={4}>
        No investments yet.
      </Text>
    );
  }

  return (
    <Box>
      {investments.map((inv) => (
        <HStack
          key={inv.id}
          justify="space-between"
          p={4}
          borderBottom="1px solid"
          borderColor={rowBorder}
          bg={rowBg}
          _hover={{ bg: rowHoverBg }}
        >
          <Box>
            <Text fontWeight="bold" color={textColor}>
              {inv.instrument || inv.name || "Investment"}
            </Text>
            <Text color={subColor}>
              Amount: ₹{Number(inv.amount || 0).toLocaleString("en-IN")}
            </Text>
            <Text color={subColor}>Date: {fmtDate(inv)}</Text>
          </Box>

          <HStack spacing={2}>
            <IconButton
              size="sm"
              aria-label="Edit"
              icon={<Edit2 size={16} />}
              onClick={() => onEdit(inv)}
              variant="ghost"
            />
            <IconButton
              size="sm"
              aria-label="Delete"
              colorScheme="red"
              icon={<Trash2 size={16} />}
              onClick={() => onDelete(inv.id)}
            />
          </HStack>
        </HStack>
      ))}
    </Box>
  );
}
