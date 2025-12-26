// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  SimpleGrid,
  Container,
  Heading,
  Spinner,
  Center,
  HStack,
  Input,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import axiosClient from "../api/axiosClient";

import TimeframeSelector from "../components/dashboard/TimeframeSelector";
import LimitsDiffDisplayByCategory from "../components/dashboard/LimitsDiffDisplay";
import BalanceCard from "../components/dashboard/BalanceCard";
import AppShell from "../components/layout/AppShell";
import TiltCard from "../components/dashboard/TiltCard";
import AnimatedNumber from "../components/dashboard/AnimatedNumber";

const MotionBox = motion(Box);
const dashboardFade = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65 } },
};

// helpers for default anchors
const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const DEFAULT_MONTH = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`; // "YYYY-MM"
const DEFAULT_DATE = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
  now.getDate()
)}`; // "YYYY-MM-DD"
const DEFAULT_YEAR = String(now.getFullYear());

const DashboardPage = () => {
  const [timeframe, setTimeframe] = useState("monthly");

  // anchors for each timeframe
  const [anchorMonth, setAnchorMonth] = useState(DEFAULT_MONTH);
  const [anchorWeek, setAnchorWeek] = useState(""); // "YYYY-Www" (falls back to date)
  const [anchorDate, setAnchorDate] = useState(DEFAULT_DATE);
  const [anchorYear, setAnchorYear] = useState(DEFAULT_YEAR);

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  // colors
  const titleGradient = useColorModeValue(
    "linear(to-r, yellow.600, orange.500)",
    "linear(to-r, yellow.300, orange.300)"
  );
  const incomeLabel = useColorModeValue("green.700", "green.300");
  const incomeValue = useColorModeValue("green.600", "green.200");
  const expenseLabel = useColorModeValue("red.700", "red.300");
  const expenseValue = useColorModeValue("red.600", "red.200");
  const investLabel = useColorModeValue("cyan.700", "cyan.300");
  const investValue = useColorModeValue("cyan.600", "cyan.200");
  const diffTitleColor = useColorModeValue("green.700", "green.300");
  const spinnerColor = useColorModeValue("orange.500", "orange.300");
  const labelColor = useColorModeValue("gray.700", "gray.300");

  // filter field tokens
  const fieldBg = useColorModeValue("white", "gray.700");
  const fieldText = useColorModeValue("gray.900", "whiteAlpha.900");
  const fieldBorder = useColorModeValue("gray.300", "whiteAlpha.400");
  const fieldBorderHov = useColorModeValue("gray.400", "whiteAlpha.500");
  const placeholderCol = useColorModeValue("gray.500", "whiteAlpha.700");
  const focusBorder = useColorModeValue("orange.500", "orange.300");
  const selectIconCol = useColorModeValue("gray.600", "whiteAlpha.800");

  // reuse on all filters
  const filterFieldProps = {
    bg: fieldBg,
    color: fieldText,
    borderColor: fieldBorder,
    _hover: { borderColor: fieldBorderHov },
    _placeholder: { color: placeholderCol },
    focusBorderColor: focusBorder,
  };

  // Build anchor string understood by the backend
  const buildAnchor = () => {
    switch (timeframe) {
      case "monthly":
        return anchorMonth || DEFAULT_MONTH; // "YYYY-MM"
      case "weekly":
        return anchorWeek || anchorDate || DEFAULT_DATE; // "YYYY-Www" or fallback date
      case "daily":
        return anchorDate || DEFAULT_DATE; // "YYYY-MM-DD"
      case "yearly":
        return anchorYear || DEFAULT_YEAR; // "YYYY"
      default:
        return undefined;
    }
  };

  // Fetch summary whenever timeframe or anchors change
  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      setLoading(true);
      try {
        const anchor = buildAnchor();
        const { data } = await axiosClient.get("/dashboard/advanced", {
          params: { timeframe, anchor },
        });

        const merged = {
          ...data,
          label: data?.label || "",
          totalIncome: Number(data?.totalIncome ?? 0),
          totalExpense: Number(data?.totalExpense ?? 0),
          totalInvestment: Number(data?.totalInvestment ?? 0),
        };

        if (!cancelled) setSummary(merged);
      } catch (error) {
        console.error("Failed to load dashboard summary", error);
        if (!cancelled) {
          setSummary(
            (s) =>
              s ?? {
                label: "",
                totalIncome: 0,
                totalExpense: 0,
                totalInvestment: 0,
                balances: { current: 0, lastWeek: 0, lastMonth: 0 },
                expenseDifferenceByCategory: [],
              }
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [timeframe, anchorMonth, anchorWeek, anchorDate, anchorYear]);

  if (loading || !summary) {
    return (
      <AppShell>
        <Center minHeight="60vh">
          <Spinner size="xl" color={spinnerColor} />
        </Center>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Container maxW="container.xl" py={2}>
        {/* Header */}
        <Heading
          mb={2}
          fontWeight="extrabold"
          fontSize="4xl"
          bgGradient={titleGradient}
          bgClip="text"
        >
          Dashboard Overview
        </Heading>

        {/* Controls: timeframe + anchor input */}
        <HStack spacing={3} align="center" flexWrap="wrap" mb={2}>
          <TimeframeSelector
            timeframe={timeframe}
            setTimeframe={setTimeframe}
            // pass styling for the Select
            selectProps={filterFieldProps}
            iconColor={selectIconCol}
          />

          {timeframe === "monthly" && (
            <Input
              type="month"
              w="180px"
              {...filterFieldProps}
              value={anchorMonth}
              onChange={(e) => setAnchorMonth(e.target.value)}
            />
          )}

          {timeframe === "weekly" && (
            <Input
              type="week"
              w="180px"
              {...filterFieldProps}
              value={anchorWeek}
              onChange={(e) => setAnchorWeek(e.target.value)}
            />
          )}

          {timeframe === "daily" && (
            <Input
              type="date"
              w="180px"
              {...filterFieldProps}
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
            />
          )}

          {timeframe === "yearly" && (
            <Input
              type="number"
              w="120px"
              min="2000"
              max="2100"
              {...filterFieldProps}
              value={anchorYear}
              onChange={(e) => setAnchorYear(e.target.value)}
              placeholder="Year"
            />
          )}
        </HStack> 

        {/* Label for what is shown */}
        {summary.label && (
          <Text fontSize="sm" color={labelColor} mb={4}>
            Showing: <strong>{summary.label}</strong>
          </Text>
        )}

        {/* KPI Cards */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} my={6}>
          <TiltCard
            as={MotionBox}
            initial="hidden"
            animate="visible"
            variants={dashboardFade}
          >
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={incomeLabel}
              mb={2}
            >
              Total Income
            </Text>
            <Text fontSize="3xl" fontWeight="bold" color={incomeValue}>
              <AnimatedNumber value={summary.totalIncome} />
            </Text>
          </TiltCard>

          <TiltCard
            as={MotionBox}
            initial="hidden"
            animate="visible"
            variants={dashboardFade}
          >
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={expenseLabel}
              mb={2}
            >
              Total Expenses
            </Text>
            <Text fontSize="3xl" fontWeight="bold" color={expenseValue}>
              <AnimatedNumber value={summary.totalExpense} />
            </Text>
          </TiltCard>

          <TiltCard
            as={MotionBox}
            initial="hidden"
            animate="visible"
            variants={dashboardFade}
          >
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={investLabel}
              mb={2}
            >
              Total Investments
            </Text>
            <Text fontSize="3xl" fontWeight="bold" color={investValue}>
              <AnimatedNumber value={summary.totalInvestment} />
            </Text>
          </TiltCard>
        </SimpleGrid>

        {/* Lower Cards */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
          <TiltCard>
            <BalanceCard
              current={summary.balances.current}
              lastWeek={summary.balances.lastWeek}
              lastMonth={summary.balances.lastMonth}
            />
          </TiltCard>

          <TiltCard
            as={MotionBox}
            initial="hidden"
            animate="visible"
            variants={dashboardFade}
            minH="225px"
          >
            <Text
              fontWeight="extrabold"
              color={diffTitleColor}
              fontSize="2xl"
              letterSpacing="wide"
              mb={5}
            >
              Difference from Limits by Category
            </Text>
            <LimitsDiffDisplayByCategory
              differences={summary.expenseDifferenceByCategory}
            />
          </TiltCard>
        </SimpleGrid>
      </Container>
    </AppShell>
  );
};

export default DashboardPage;
