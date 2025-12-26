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

import InvestmentList from "../components/investment/InvestmentList";
import InvestmentForm from "../components/investment/InvestmentForm";
import AppShell from "../components/layout/AppShell";

const MotionBox = motion(Box);

/* ---------- inline helpers ---------- */
function TechCard({ children, ...props }) {
  const bg = useColorModeValue("whiteAlpha.800", "whiteAlpha.100");
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const glow = useColorModeValue(
    "rgba(0,136,255,0.18)",
    "rgba(0,136,255,0.28)"
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

function AnimatedNumber({ value = 0, fmt = (v) => v.toLocaleString() }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 20, stiffness: 120 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  React.useEffect(() => {
    mv.set(Number(value || 0));
  }, [value]);
  return <>{fmt(Number(rounded.get() || 0))}</>;
}

/* ------------------------------------ */

const InvestmentPage = () => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Dark-mode friendly tokens
  const titleGradient = useColorModeValue(
    "linear(to-r, blue.500, cyan.500)",
    "linear(to-r, blue.300, cyan.300)"
  );
  const kpiLabel = useColorModeValue("gray.600", "gray.300");
  const totalLabel = useColorModeValue("blue.700", "blue.300");
  const totalValue = useColorModeValue("blue.600", "blue.200");
  const countLabel = useColorModeValue("cyan.700", "cyan.300");
  const countValue = useColorModeValue("cyan.500", "cyan.200");
  const avgLabel = useColorModeValue("purple.700", "purple.300");
  const avgValue = useColorModeValue("purple.500", "purple.200");
  const listText = useColorModeValue("gray.800", "gray.100");

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/investments");
      const rows = Array.isArray(res.data)
        ? res.data
        : res.data?.investments || [];
      setInvestments(rows);
    } catch (e) {
      console.error("Failed to load investments", e);
      setInvestments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const onEdit = (investment) => {
    setSelectedInvestment(investment);
    onOpen();
  };
  const onAddNew = () => {
    setSelectedInvestment(null);
    onOpen();
  };
  const onFormClose = () => {
    onClose();
    fetchInvestments();
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/investments/${id}`);
      fetchInvestments();
    } catch (err) {
      console.error(
        "Failed to delete investment",
        err.response?.status,
        err.response?.data || err.message
      );
    }
  };

  // KPIs
  const total = useMemo(
    () => investments.reduce((s, i) => s + Number(i.amount || 0), 0),
    [investments]
  );
  const count = investments.length;
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
            Investments
          </Heading>
          <Button colorScheme="blue" onClick={onAddNew}>
            Add Investment
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
              Total Invested
            </Text>
            <Heading size="lg" color={totalValue}>
              <AnimatedNumber value={total} />
            </Heading>
            <Text mt={2} fontSize="sm" color={kpiLabel}>
              Sum of all positions
            </Text>
          </TechCard>

          <TechCard>
            <Text
              textTransform="uppercase"
              fontWeight="bold"
              color={countLabel}
              mb={1}
            >
              Positions
            </Text>
            <Heading size="lg" color={countValue}>
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
              Average Size
            </Text>
            <Heading size="lg" color={avgValue}>
              <AnimatedNumber value={avg} />
            </Heading>
            <Text mt={2} fontSize="sm" color={kpiLabel}>
              Per position
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
            <InvestmentList
              investments={investments}
              onEdit={onEdit}
              onDelete={handleDelete}
            />
          </TechCard>
        )}

        {/* Form */}
        {isOpen && (
          <InvestmentForm
            isOpen={isOpen}
            onClose={onFormClose}
            investment={selectedInvestment}
          />
        )}
      </Box>
    </AppShell>
  );
};

export default InvestmentPage;
