import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Heading,
  Button,
  SimpleGrid,
  Spinner,
  Center,
  useDisclosure,
  HStack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import axiosClient from "../api/axiosClient";

import ExpenseList from "../components/expense/ExpenseList";
import ExpenseForm from "../components/expense/ExpenseForm";
import AppShell from "../components/layout/AppShell";

const MotionBox = motion(Box);

/* ---------- inline helpers (no extra files) ---------- */

// glossy/tilt card
function TechCard({ children, ...props }) {
  const bg = useColorModeValue("whiteAlpha.800", "whiteAlpha.100");
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const glow = useColorModeValue(
    "rgba(255,138,0,0.20)",
    "rgba(255,138,0,0.28)"
  );

  const onMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(py - 0.5) * -6}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 6}deg`);
  };
  const onLeave = (e) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  };

  return (
    <MotionBox
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transform: "perspective(900px) rotateX(var(--rx)) rotateY(var(--ry))",
      }}
      transition="transform .08s ease"
      bg={bg}
      border="1px solid"
      borderColor={border}
      rounded="2xl"
      boxShadow={`0 16px 40px ${glow}`}
      p={6}
      whileHover={{ scale: 1.02 }}
      {...props}
    >
      {children}
    </MotionBox>
  );
}

// animated number
function AnimatedNumber({ value = 0, fmt = (v) => v.toLocaleString() }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 20, stiffness: 120 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  React.useEffect(() => {
    mv.set(Number(value || 0));
  }, [value]);
  return <>{fmt(Number(rounded.get() || 0))}</>;
}

/* ------------------------------------------------------ */

const ExpensePage = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // light/dark text colors for KPIs
  const titleGradient = useColorModeValue(
    "linear(to-r, red.500, orange.500)",
    "linear(to-r, red.300, orange.300)"
  );
  const kpiLabel = useColorModeValue("gray.600", "gray.300");
  const totalLabel = useColorModeValue("red.700", "red.300");
  const totalValue = useColorModeValue("red.600", "red.200");
  const entriesLabel = useColorModeValue("orange.700", "orange.300");
  const entriesValue = useColorModeValue("orange.500", "orange.200");
  const avgLabel = useColorModeValue("purple.700", "purple.300");
  const avgValue = useColorModeValue("purple.500", "purple.200");
  const listText = useColorModeValue("gray.800", "gray.100"); // for ExpenseList container

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/expenses");
      const rows = Array.isArray(response.data)
        ? response.data
        : response.data?.expenses || [];
      setExpenses(rows);
    } catch (error) {
      console.error("Failed to load expenses", error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const onEdit = (expense) => {
    setSelectedExpense(expense);
    onOpen();
  };

  const onAddNew = () => {
    setSelectedExpense(null);
    onOpen();
  };

  const onFormClose = () => {
    onClose();
    fetchExpenses();
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      console.error(
        "Failed to delete expense",
        err.response?.status,
        err.response?.data || err.message
      );
    }
  };

  // KPIs
  const total = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses]
  );
  const count = expenses.length;
  const avg = count ? Math.round(total / count) : 0;

  return (
    <AppShell>
      <Box>
        {/* Header */}
        <HStack
          justify="space-between"
          align="center"
          mb={6}
          flexWrap="wrap"
          gap={3}
        >
          <Heading
            size="xl"
            fontWeight="extrabold"
            bgClip="text"
            bgGradient={titleGradient}
          >
            Expenses
          </Heading>
          <Button colorScheme="red" onClick={onAddNew}>
            Add Expense
          </Button>
        </HStack>

        {/* KPIs */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
          <TechCard>
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={totalLabel}
              mb={1}
            >
              Total Expenses
            </Text>
            <Heading size="lg" color={totalValue}>
              <AnimatedNumber value={total} />
            </Heading>
            <Text mt={2} fontSize="sm" color={kpiLabel}>
              Sum of all entries
            </Text>
          </TechCard>

          <TechCard>
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={entriesLabel}
              mb={1}
            >
              Entries
            </Text>
            <Heading size="lg" color={entriesValue}>
              <AnimatedNumber value={count} />
            </Heading>
            <Text mt={2} fontSize="sm" color={kpiLabel}>
              Total items
            </Text>
          </TechCard>

          <TechCard>
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={avgLabel}
              mb={1}
            >
              Average
            </Text>
            <Heading size="lg" color={avgValue}>
              <AnimatedNumber value={avg} />
            </Heading>
            <Text mt={2} fontSize="sm" color={kpiLabel}>
              Per entry
            </Text>
          </TechCard>
        </SimpleGrid>

        {/* List */}
        {loading ? (
          <Center py={20}>
            <Spinner size="xl" />
          </Center>
        ) : (
          <TechCard p={0} color={listText}>
            <ExpenseList
              expenses={expenses}
              onEdit={onEdit}
              onDelete={handleDelete}
            />
          </TechCard>
        )}

        {/* Modal/Drawer form */}
        {isOpen && (
          <ExpenseForm
            isOpen={isOpen}
            onClose={onFormClose}
            expense={selectedExpense}
          />
        )}
      </Box>
    </AppShell>
  );
};

export default ExpensePage;
