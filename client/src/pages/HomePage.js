import Logo from "../assests/PennyPilot.png";
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  Container,
  Image,
  useColorModeValue,
  HStack,
  Tag,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import AmbientTechBg from "../components/AmbientTechBG";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const MotionVStack = motion(VStack);
const MotionHeading = motion(Heading);
const MotionText = motion(Text);
const MotionImage = motion(Image);
const MotionButton = motion(Button);

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.12 * i, ease: "easeOut" },
  }),
};

const HomePage = () => {
  // High-contrast, color-mode-aware tokens
  const bg = useColorModeValue("#faf8f3", "#0b0d12");
  const primary = "#ff8a00";
  const headingColor = useColorModeValue("gray.900", "whiteAlpha.900");
  const bodyColor = useColorModeValue("gray.700", "whiteAlpha.800");
  const cardBg = useColorModeValue("white", "whiteAlpha.100");
  const cardBorder = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const isDark = useColorModeValue(false, true);

// Track the page scroll
  const { scrollYProgress } = useScroll();
  // Fade out between the top and ~35% page scroll
  const opacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
   const ref = useRef(null);
  

  return (
    <Box
      position="relative"
      minH="100vh"
      pt={{ base: 24, md: 28 }}
      pb={16}
      overflow="hidden"
    >
      <AmbientTechBg hue={28} intensity={0.16} />
      {/* ambient ring (only in dark mode) */}
      {isDark && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          w={{ base: "80vmin", md: "65vmin" }}
          h={{ base: "80vmin", md: "65vmin" }}
          rounded="full"
          bg={`conic-gradient(from 180deg at 50% 50%, ${primary}, rgba(255,255,255,0.1), ${primary})`}
          opacity={0.08}
          filter="blur(40px)"
          zIndex={0}
        />
      )}

      <Container
        maxW="container.md"
        px={{ base: 6, md: 8 }}
        position="relative"
        zIndex={1}
      >
        <MotionVStack
          spacing={8}
          align="center"
          textAlign="center"
          minH="calc(100vh - 160px)"
          justify="center"
          initial="hidden"
          animate="visible"
        >
          {/* Logo card */}
          <Box
            position="relative"
            p={{ base: 3, md: 4 }}
            rounded="3xl"
            bg={cardBg}
            border="1px solid"
            borderColor={cardBorder}
            boxShadow={useColorModeValue(
              "0 12px 48px rgba(0,0,0,0.12)",
              "0 10px 40px rgba(0,0,0,0.35)"
            )}
          >
            <MotionImage
              src={Logo}
              alt="PennyPilot Logo"
              maxH={{ base: "140px", md: "180px" }}
              borderRadius="2xl"
              draggable={false}
              style={{ opacity }}
            />
          </Box>

          {/* Badges */}
          <HStack spacing={2} as={motion.div} variants={fadeUp} custom={0}>
            <Tag variant="subtle" colorScheme="orange" fontWeight="bold">
              New
            </Tag>
            <Tag variant="subtle" colorScheme="purple">
              Smart Budgeting
            </Tag>
            <Tag variant="subtle" colorScheme="cyan">
              Investment Tracker
            </Tag>
          </HStack>

          {/* Headline */}
          <MotionHeading
            as="h1"
            size="2xl"
            lineHeight="1.1"
            fontWeight="extrabold"
            color={headingColor}
            // Use gradient only in dark mode for clarity
            bgClip={isDark ? "text" : undefined}
            bgGradient={
              isDark
                ? `linear(to-r, ${primary}, teal.300, purple.400)`
                : undefined
            }
            variants={fadeUp}
            custom={1}
          >
            Take Control of Your Finances
          </MotionHeading>

          {/* Subtext */}
          <MotionText
            fontSize={{ base: "md", md: "lg" }}
            maxW={{ base: "lg", md: "2xl" }}
            color={bodyColor}
            variants={fadeUp}
            custom={2}
          >
            Track income, expenses, and investments in one place. Set goals,
            stay on budget, and make smarter money decisions—with clear,
            delightful insights.
          </MotionText>

          {/* CTA */}
          <MotionButton
            as={RouterLink}
            to="/dashboard"
            size="lg"
            px={8}
            py={6}
            fontWeight="bold"
            rounded="xl"
            bg={primary}
            color={useColorModeValue("white", bg)}
            _hover={{ filter: "brightness(1.05)" }}
            _active={{ transform: "translateY(1px)" }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            variants={fadeUp}
            custom={3}
            boxShadow={useColorModeValue(
              "0 12px 24px rgba(255,138,0,0.25)",
              "0 12px 30px rgba(255,138,0,0.35)"
            )}
          >
            Get Started
          </MotionButton>

          {/* Login link */}
          <MotionText
            fontSize="sm"
            color={bodyColor}
            variants={fadeUp}
            custom={4}
          >
            Already have an account?{" "}
            <Box
              as={RouterLink}
              to="/login"
              color={primary}
              fontWeight="semibold"
              _hover={{ textDecoration: "underline" }}
              display="inline"
            >
              Log in
            </Box>
          </MotionText>
        </MotionVStack>
      </Container>
    </Box>
  );
};

export default HomePage;
