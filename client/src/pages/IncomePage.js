import React, { useEffect, useState, useMemo } from "react";
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

import IncomeList from "../components/income/IncomeList";
import IncomeForm from "../components/income/IncomeForm";
import AppShell from "../components/layout/AppShell";

const MotionBox = motion(Box);

/* ---------- small helpers ---------- */

// 3D tilt + glossy card
function TechCard({ children, ...props }) {
  const bg = useColorModeValue("whiteAlpha.800", "whiteAlpha.100");
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const glow = useColorModeValue(
    "rgba(255,138,0,0.20)",
    "rgba(255,138,0,0.28)"
  );

  const handleMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(py - 0.5) * -6}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 6}deg`);
  };
  const reset = (e) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  };

  return (
    <MotionBox
      onMouseMove={handleMove}
      onMouseLeave={reset}
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
      {...props}
    >
      {children}
    </MotionBox>
  );
}

// animated count-up number
function AnimatedNumber({ value = 0, fmt = (v) => v.toLocaleString() }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 20, stiffness: 120 });
  const rounded = useTransform(spring, (v) => Math.round(v));

  React.useEffect(() => {
    mv.set(Number(value || 0));
  }, [value]);

  return <>{fmt(Number(rounded.get() || 0))}</>;
}

/* ------------------------------------------------------------ */

const IncomePage = () => {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // ACCESSIBLE COLOR TOKENS
  const titleGradient = useColorModeValue(
    "linear(to-r, orange.500, green.600)",
    "linear(to-r, orange.300, green.300)"
  );
  const kpiLabel = useColorModeValue("gray.600", "gray.300");
  const totalLabel = useColorModeValue("green.700", "green.300");
  const totalValue = useColorModeValue("green.600", "green.200");
  const entriesLabel = useColorModeValue("orange.700", "orange.300");
  const entriesValue = useColorModeValue("orange.500", "orange.200");
  const avgLabel = useColorModeValue("cyan.700", "cyan.300");
  const avgValue = useColorModeValue("cyan.500", "cyan.200");
  const listText = useColorModeValue("gray.800", "gray.100");

  const fetchIncomes = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/api/incomes");
      setIncomes(
        Array.isArray(response.data)
          ? response.data
          : response.data?.income || []
      );
    } catch (error) {
      console.error("Failed to load incomes", error);
      setIncomes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/api/incomes/${id}`);
      fetchIncomes();
    } catch (err) {
      console.error(
        "Failed to delete income",
        err.response?.status,
        err.response?.data || err.message
      );
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const onEdit = (income) => {
    setSelectedIncome(income);
    onOpen();
  };

  const onAddNew = () => {
    setSelectedIncome(null);
    onOpen();
  };

  const onFormClose = () => {
    onClose();
    fetchIncomes();
  };

  // KPIs
  const total = useMemo(
    () => incomes.reduce((s, i) => s + Number(i.amount || 0), 0),
    [incomes]
  );
  const count = incomes.length;
  const avg = count ? Math.round(total / count) : 0;

  return (
    <AppShell>
      <Box>
        {/* Header row */}
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
            Income
          </Heading>
          <Button colorScheme="orange" onClick={onAddNew}>
            Add Income
          </Button>
        </HStack>

        {/* KPI cards */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
          <TechCard>
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={totalLabel}
              mb={1}
            >
              Total Income
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
            <IncomeList
              incomes={incomes}
              onEdit={onEdit}
              onDelete={handleDelete}
            />
          </TechCard>
        )}

        {/* Drawer/Modal form */}
        {isOpen && (
          <IncomeForm
            isOpen={isOpen}
            onClose={onFormClose}
            income={selectedIncome}
          />
        )}
      </Box>
    </AppShell>
  );
};

export default IncomePage;
