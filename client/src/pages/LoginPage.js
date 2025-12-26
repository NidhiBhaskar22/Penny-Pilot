import React, { useState, useContext } from "react";
import axiosClient from "../api/axiosClient";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AmbientTechBg from "../components/AmbientTechBG";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Heading,
  Text,
  useColorModeValue,
  Center,
} from "@chakra-ui/react";

const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Light/Dark tokens
  const cardBg = useColorModeValue("white", "gray.800");
  const cardColor = useColorModeValue("gray.900", "gray.100");
  const cardBorder = useColorModeValue("gray.200", "whiteAlpha.300");
  const errorColor = useColorModeValue("red.600", "red.300");
  const labelColor = useColorModeValue("gray.700", "gray.300");
  const headingGrad = useColorModeValue(
    "linear(to-r, teal.600, green.600)",
    "linear(to-r, teal.300, green.300)"
  );

  const fieldBg = useColorModeValue("white", "gray.700");
  const fieldText = useColorModeValue("gray.900", "whiteAlpha.900");
  const fieldBorder = useColorModeValue("gray.200", "whiteAlpha.300");
  const fieldBorderHov = useColorModeValue("gray.300", "whiteAlpha.400");
  const placeholder = useColorModeValue("gray.500", "whiteAlpha.600");
  const focusBorder = useColorModeValue("teal.500", "teal.300");

  const fieldProps = {
    bg: fieldBg,
    color: fieldText,
    borderColor: fieldBorder,
    _hover: { borderColor: fieldBorderHov },
    _placeholder: { color: placeholder },
    focusBorderColor: focusBorder,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <Box position="relative" minH="100vh" overflow="hidden">
      {/* tech background */}
      <AmbientTechBg hue={28} intensity={0.14} />

      <Center position={"relative"} zIndex={1} minH="100vh" px={4}>

      {/* login card */}
      <Box
        position="relative"
        zIndex={1}
        maxW="xl"
        mx="auto"
        mt={10}
        p={6}
        bg={cardBg}
        color={cardColor}
        borderWidth={10}
        borderColor={cardBorder}
        borderRadius="md"
        boxShadow="lg"
      >
        <Heading mb={6} size="lg" bgClip="text" bgGradient={headingGrad}>
          Login
        </Heading>

        {error && (
          <Text color={errorColor} mb={4} role="alert">
            {error}
          </Text>
        )}

        <form onSubmit={handleSubmit}>
          <FormControl mb={4} isRequired>
            <FormLabel color={labelColor}>Email</FormLabel>
            <Input
              {...fieldProps}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormControl>

          <FormControl mb={6} isRequired>
            <FormLabel color={labelColor}>Password</FormLabel>
            <Input
              {...fieldProps}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormControl>

          <Button colorScheme="teal" type="submit" width="full">
            Login
          </Button>
        </form>
        </Box>
        </Center>
    </Box>
  );
};

export default LoginPage;
