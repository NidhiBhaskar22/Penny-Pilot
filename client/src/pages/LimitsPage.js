import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Heading,
  Button,
  Spinner,
  Center,
  useDisclosure,
  SimpleGrid,
  HStack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";
import axiosClient from "../api/axiosClient";

import LimitsForm from "../components/limits/LimitsForm";
import AppShell from "../components/layout/AppShell"; // ⬅️ same sidebar + tech BG

const MotionBox = motion(Box);

/* ---------- inline helpers (no extra files) ---------- */

// glossy tilt card
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
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    mv.set(Number(value || 0));
  }, [value, mv]);

  useMotionValueEvent(spring, "change", (v) => {
    setDisplay(Math.round(v));
  });

  return <>{fmt(display)}</>;
}

/* ----------------------------------------------------- */

const LimitsPage = () => {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedLimit, setSelectedLimit] = useState(null);

    const titleGradient = useColorModeValue(
      "linear(to-r, teal.500, green.600)",
      "linear(to-r, teal.300, green.300)"
    );
    const kpiLabel = useColorModeValue("gray.600", "gray.300");
    const catLabel = useColorModeValue("orange.700", "orange.300");
    const catValue = useColorModeValue("orange.600", "orange.200");
    const monLabel = useColorModeValue("green.700", "green.300");
    const monValue = useColorModeValue("green.600", "green.200");
    const wkLabel = useColorModeValue("cyan.700", "cyan.300");
    const wkValue = useColorModeValue("cyan.500", "cyan.200");
    const dayLabel = useColorModeValue("purple.700", "purple.300");
    const dayValue = useColorModeValue("purple.500", "purple.200");
    const cardHeading = useColorModeValue("gray.900", "gray.100");

  const fetchLimits = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/limits");
      setLimits(
        Array.isArray(response.data)
          ? response.data
          : response.data?.limits || []
      );
    } catch (error) {
      console.error("Failed to load limits", error);
      setLimits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  const onEdit = (limit) => {
    setSelectedLimit(limit);
    onOpen();
  };

  const onFormClose = () => {
    onClose();
    setSelectedLimit(null);
    fetchLimits();
  };

  // KPIs (aggregates)
  const totalCategories = limits.length;
  const totalMonthly = useMemo(
    () => limits.reduce((s, l) => s + Number(l.monthlyLimit || 0), 0),
    [limits]
  );
  const totalWeekly = useMemo(
    () => limits.reduce((s, l) => s + Number(l.weeklyLimit || 0), 0),
    [limits]
  );
  const totalDaily = useMemo(
    () => limits.reduce((s, l) => s + Number(l.dailyLimit || 0), 0),
    [limits]
  );

  if (loading) {
    return (
      <AppShell>
        <Center minHeight="60vh">
          <Spinner size="xl" />
        </Center>
      </AppShell>
    );
  }


  return (
    <AppShell>
      <Box>
        {/* Page header */}
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
            bgGradient="linear(to-r, teal.400, green.400)"
          >
            Expenditure Limits
          </Heading>
          <Button onClick={() => onEdit(null)} colorScheme="green">
            {limits.length ? "Add New Limit" : "Set Limits"}
          </Button>
        </HStack>

        {/* KPI cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={6}>
          <TechCard>
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={catLabel}
              mb={1}
            >
              Categories
            </Text>
            <Heading size="lg" color={catValue}>
              <AnimatedNumber value={totalCategories} />
            </Heading>
            <Text mt={2} fontSize="sm" color={kpiLabel}>
              With configured limits
            </Text>
          </TechCard>

          <TechCard>
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={monLabel}
              mb={1}
            >
              Total Monthly
            </Text>
            <Heading size="lg" color={monValue}>
              <AnimatedNumber value={totalMonthly} />
            </Heading>
            <Text mt={2} fontSize="sm" color={kpiLabel}>
              ₹ across all categories
            </Text>
          </TechCard>

          <TechCard>
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={wkLabel}
              mb={1}
            >
              Total Weekly
            </Text>
            <Heading size="lg" color={wkValue}>
              <AnimatedNumber value={totalWeekly} />
            </Heading>
            <Text mt={2} fontSize="sm" color={kpiLabel}>
              ₹ across all categories
            </Text>
          </TechCard>

          <TechCard>
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={dayLabel}
              mb={1}
            >
              Total Daily
            </Text>
            <Heading size="lg" color={dayValue}>
              <AnimatedNumber value={totalDaily} />
            </Heading>
            <Text mt={2} fontSize="sm" color={kpiLabel}>
              ₹ across all categories
            </Text>
          </TechCard>
        </SimpleGrid>

        {/* List of limits */}
        {limits.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
            {limits.map((limit) => (
              <TechCard
                key={
                  limit.id ||
                  limit._id ||
                  `${limit.category}-${limit.monthlyLimit}`
                }
              >
                <Heading size="md" mb={2} color={cardHeading}>
                  {limit.category || "General"}
                </Heading>
                <Box color={kpiLabel} mb={4}>
                  <Text>
                    <strong>Monthly:</strong> ₹
                    {Number(limit.monthlyLimit || 0).toLocaleString()}
                  </Text>
                  <Text>
                    <strong>Weekly:</strong> ₹
                    {Number(limit.weeklyLimit || 0).toLocaleString()}
                  </Text>
                  <Text>
                    <strong>Daily:</strong> ₹
                    {Number(limit.dailyLimit || 0).toLocaleString()}
                  </Text>
                </Box>
                <Button
                  colorScheme="teal"
                  size="sm"
                  onClick={() => onEdit(limit)}
                >
                  Edit
                </Button>
              </TechCard>
            ))}
          </SimpleGrid>
        ) : (
          <TechCard>
            <Text color={kpiLabel}>No limits set yet. Click “Set Limits”.</Text>
          </TechCard>
        )}

        {/* Modal/Drawer form */}
        {isOpen && (
          <LimitsForm
            isOpen={isOpen}
            onClose={onFormClose}
            limits={selectedLimit}
          />
        )}
      </Box>
    </AppShell>
  );
};

export default LimitsPage;
