import React, { useState, useContext } from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  useToast,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const slides = [
  {
    title: "Welcome to PennyPilot",
    body: "Track income, expenses, and investments effortlessly.",
  },
  {
    title: "See Your Limits",
    body: "Set monthly/weekly/daily budgets and get alerts before you overspend.",
  },
  {
    title: "Start with a Baseline",
    body: "We’ll begin with your current bank balance, then keep it updated.",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const { completeProfile } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();

  const next = () => setStep((s) => Math.min(s + 1, slides.length));
  const skip = () => setStep(slides.length);

  const save = async () => {
    try {
      await completeProfile({
        name,
        balance: Number(balance),
      }); // ✅ use AuthContext, correct keys
      toast({ title: "Setup complete", status: "success" });
      navigate("/dashboard");
    } catch (e) {
      toast({
        title: e?.response?.data?.message || "Failed to save",
        status: "error",
      });
    }
  };

  return (
    <Box
      maxW="560px"
      mx="auto"
      mt={10}
      p={6}
      borderWidth="1px"
      borderRadius="lg"
    >
      {step < slides.length ? (
        <VStack spacing={6} align="stretch">
          <Heading size="lg">{slides[step].title}</Heading>
          <Text opacity={0.9}>{slides[step].body}</Text>
          <HStack justify="space-between">
            <Button variant="ghost" onClick={skip}>
              Skip
            </Button>
            <Button onClick={next}>Next</Button>
          </HStack>
        </VStack>
      ) : (
        <VStack spacing={5} align="stretch">
          <Heading size="lg">Just two quick details</Heading>
          <Box>
            <Text mb={2}>Name *</Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., madhwansh"
            />
          </Box>
          <Box>
            <Text mb={2}>Current Bank Balance *</Text>
            <Input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="e.g., 120000"
            />
          </Box>
          <HStack justify="flex-end">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Skip for now
            </Button>
            <Button
              colorScheme="blue"
              onClick={save}
              isDisabled={!name || balance === ""}
            >
              Save & Go to Dashboard
            </Button>
          </HStack>
        </VStack>
      )}
    </Box>
  );
}
