import React, { useContext } from "react";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Tooltip,
  Avatar,
  useColorMode,
  useColorModeValue,
  Link,
} from "@chakra-ui/react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

/** Simple inline SVG icons (no extra deps) */
const Icon = ({ path, ...props }) => (
  <Box
    as="svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d={path} />
  </Box>
);
const IGrid = (p) => (
  <Icon path="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" {...p} />
);
const IArrowUp = (p) => <Icon path="M12 19V5m0 0l-7 7m7-7l7 7" {...p} />;
const IArrowDown = (p) => <Icon path="M12 5v14m0 0l7-7m-7 7l-7-7" {...p} />;
const IChart = (p) => <Icon path="M3 20h18M6 16V8m6 16V4m6 16v-6" {...p} />;
const IShield = (p) => (
  <Icon path="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" {...p} />
);

const NavItem = ({ to, icon, label, active, collapsed }) => {
  const activeBg = useColorModeValue("orange.100", "whiteAlpha.200");
  const hoverBg = useColorModeValue("blackAlpha.50", "whiteAlpha.100");
  const textCol = useColorModeValue("gray.800", "gray.100");
  const activeText = useColorModeValue("gray.900", "white");

  const content = (
    <HStack
      as={RouterLink}
      to={to}
      spacing={3}
      px={3}
      py={2.5}
      rounded="xl"
      transition="all .18s ease"
      bg={active ? activeBg : "transparent"}
      _hover={{ bg: hoverBg, transform: "translateX(2px)" }}
      color={active ? activeText : textCol}
    >
      {icon}
      {!collapsed && (
        <Text fontWeight={active ? "bold" : "medium"}>{label}</Text>
      )}
    </HStack>
  );

  return collapsed ? (
    <Tooltip label={label} placement="right" hasArrow>
      <Box>{content}</Box>
    </Tooltip>
  ) : (
    content
  );
};

export default function Sidebar({ collapsed, onToggle }) {
  const { colorMode, toggleColorMode } = useColorMode();

  // Light/Dark tokens
  const bg = useColorModeValue(
    "linear-gradient(180deg, #fffdfa, #f6f3eb)",
    "linear-gradient(180deg, #0b0d12, #0d1117)"
  );
  const text = useColorModeValue("gray.800", "gray.100");
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const accent = useColorModeValue("orange.500", "orange.400");
  const cardBg = useColorModeValue("blackAlpha.50", "whiteAlpha.100");
  const gridLine = useColorModeValue(
    "rgba(0,0,0,0.06)",
    "rgba(255,255,255,0.08)"
  );
  const overlayOpacity = useColorModeValue(0.12, 0.16);

  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAuthed = !!user;

  const initials =
    user?.name
      ?.split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PP";

  const items = [
    { to: "/dashboard", label: "Dashboard", icon: <IGrid w={5} h={5} /> },
    { to: "/income", label: "Income", icon: <IArrowDown w={5} h={5} /> },
    { to: "/expense", label: "Expense", icon: <IArrowUp w={5} h={5} /> },
    { to: "/investment", label: "Investment", icon: <IChart w={5} h={5} /> },
    { to: "/limits", label: "Limits", icon: <IShield w={5} h={5} /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <Box
      as="aside"
      role="navigation"
      position="fixed"
      left={0}
      top={0}
      h="100vh"
      w={collapsed ? "76px" : "260px"}
      transition="width .2s ease"
      bg={bg}
      color={text}
      borderRight="1px solid"
      borderColor={border}
      zIndex={15}
      _before={{
        content: '""',
        position: "absolute",
        inset: 0,
        background: `
          repeating-linear-gradient(0deg, transparent, transparent 31px, ${gridLine} 32px),
          repeating-linear-gradient(90deg, transparent, transparent 31px, ${gridLine} 32px)
        `,
        opacity: overlayOpacity,
        pointerEvents: "none",
      }}
    >
      {/* Top bar */}
      <Flex
        align="center"
        h="64px"
        px={3}
        borderBottom="1px solid"
        borderColor={border}
      >
        <HStack w="full" justify="space-between">
          <HStack spacing={3}>
            <Box
              w="36px"
              h="36px"
              rounded="lg"
              bg={accent}
              opacity={0.9}
              boxShadow={`0 0 30px ${accent}55`}
            />
            {!collapsed && (
              <Text fontWeight="extrabold" letterSpacing="wide">
                PennyPilot
              </Text>
            )}
          </HStack>
          <IconButton
            size="sm"
            aria-label="Collapse"
            variant="ghost"
            onClick={onToggle}
            _hover={{
              bg: useColorModeValue("blackAlpha.50", "whiteAlpha.100"),
            }}
            icon={<Box as="span">{collapsed ? "»" : "«"}</Box>}
          />
        </HStack>
      </Flex>

      {/* Links */}
      <VStack align="stretch" px={2} pt={3} spacing={1.5}>
        {items.map((it) => (
          <NavItem
            key={it.to}
            to={it.to}
            label={it.label}
            icon={it.icon}
            collapsed={collapsed}
            active={location.pathname.startsWith(it.to)}
          />
        ))}
      </VStack>

      {/* Bottom block */}
      <VStack
        position="absolute"
        bottom={3}
        left={0}
        right={0}
        px={2}
        spacing={2}
      >
        <HStack
          px={3}
          py={2.5}
          rounded="xl"
          bg={cardBg}
          border="1px solid"
          borderColor={border}
          w="full"
        >
          <Avatar size="sm" name={user?.name || "Guest"} />
          {!collapsed && (
            <Box>
              <Text fontWeight="semibold" noOfLines={1}>
                {user?.name || "Guest"}
              </Text>
              <Text fontSize="xs" opacity={0.7} noOfLines={1}>
                {user?.email || "—"}
              </Text>
            </Box>
          )}
        </HStack>

        <HStack w="full" spacing={2}>
          <Button onClick={toggleColorMode} variant="outline" w="full">
            {colorMode === "light" ? "Dark" : "Light"}
          </Button>
          {isAuthed ? (
            <Button
              onClick={handleLogout}
              colorScheme="red"
              variant="solid"
              w="full"
            >
              Logout
            </Button>
          ) : (
            <>
              <Button as={RouterLink} to="/login" colorScheme="orange" w="full">
                Login
              </Button>
              {!collapsed && (
                <Button
                  as={RouterLink}
                  to="/register"
                  variant="outline"
                  w="full"
                >
                  Register
                </Button>
              )}
            </>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}
