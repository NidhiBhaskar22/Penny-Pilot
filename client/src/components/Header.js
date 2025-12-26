import React, { useContext } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Flex,
  HStack,
  Link,
  Button,
  Spacer,
  Image,
  useTheme,
  useColorMode,
  useColorModeValue,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuDivider,
  Text,
  IconButton,
} from "@chakra-ui/react";
import { AuthContext } from "../context/AuthContext";
import TextLogo from "../assests/textlogo.png";

const Header = () => {
  const theme = useTheme();
  const { colorMode, toggleColorMode } = useColorMode();
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // ✅ Hooks called unconditionally at top-level
  const fallbackHeaderFg = useColorModeValue("white", "whiteAlpha.900");
  const menuListColor = useColorModeValue("gray.800", "gray.100");

  // Fallback tokens if custom theme colors aren't defined
  const headerBg =
    theme?.colors?.primary?.[500] ??
    (colorMode === "light" ? "orange.500" : "gray.900");
  const headerFg =
    (theme?.colors?.background && theme.colors.background[50]) ??
    fallbackHeaderFg;
  const linkHover = headerFg;

  const isAuthed = !!user;
  const initials =
    user?.name
      ?.split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PP";

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  };

  return (
    <Box
      bg={headerBg}
      color={headerFg}
      px={6}
      py={4}
      shadow="md"
      position="sticky"
      top={0}
      zIndex={20}
    >
      <Flex align="center" maxW="1200px" mx="auto" gap={4}>
        {/* Brand */}
        <Link as={RouterLink} to="/" _hover={{ textDecoration: "none" }}>
          <Image
            src={TextLogo}
            alt="Penny Pilot Logo"
            height="40px"
            objectFit="contain"
            cursor="pointer"
          />
        </Link>

        <Spacer />

        

        {/* Right actions: theme + profile */}
        <HStack spacing={2} align="center">
          {/* Theme toggle (emoji, no @chakra-ui/icons needed) */}
          <IconButton
            aria-label="Toggle theme"
            onClick={toggleColorMode}
            variant="outline"
            borderColor="whiteAlpha.400"
            _hover={{ bg: "whiteAlpha.200" }}
            _active={{ bg: "whiteAlpha.300" }}
            icon={
              <Box as="span" fontSize="lg">
                {colorMode === "light" ? "🌙" : "☀️"}
              </Box>
            }
          />

          {/* Profile dropdown */}
          <Menu placement="bottom-end" autoSelect={false}>
            <MenuButton
              as={Button}
              variant="outline"
              borderColor="whiteAlpha.400"
              _hover={{ bg: "whiteAlpha.200" }}
              _active={{ bg: "whiteAlpha.300" }}
              leftIcon={
                <Avatar
                  size="sm"
                  name={user?.name || "Guest"}
                  src={user?.avatarUrl || undefined}
                  bg="whiteAlpha.300"
                  color={headerBg}
                >
                  {!user?.avatarUrl ? initials : null}
                </Avatar>
              }
            >
              <Text as="span" display={{ base: "none", md: "inline" }}>
                {isAuthed ? user?.name : "Guest"}
              </Text>
            </MenuButton>

            <MenuList color={menuListColor}>
              <MenuGroup title={isAuthed ? "Signed in" : "Not signed in"}>
                <Box px={3} py={2}>
                  <Text fontWeight="semibold">{user?.name || "Guest"}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {user?.email || "—"}
                  </Text>
                </Box>
              </MenuGroup>

              <MenuDivider />

              <MenuItem as={RouterLink} to="/dashboard">
                My Dashboard
              </MenuItem>
              

              <MenuDivider />

              {!isAuthed ? (
                <>
                  <MenuItem as={RouterLink} to="/login">
                    Log in
                  </MenuItem>
                  <MenuItem as={RouterLink} to="/register">
                    Register
                  </MenuItem>
                </>
              ) : (
                <MenuItem
                  onClick={handleLogout}
                  color="red.400"
                  fontWeight="semibold"
                >
                  Log out
                </MenuItem>
              )}
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
};

export default Header;
