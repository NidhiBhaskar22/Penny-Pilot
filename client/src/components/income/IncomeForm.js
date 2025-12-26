import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useColorModeValue,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
} from "@chakra-ui/react";
import axiosClient from "../../api/axiosClient";

// Helper: IST-safe date string for <input type="date">
function toISTDateInputValue(dateLike) {
  const d = new Date(dateLike);
  const dd = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(d) // "DD/MM/YYYY"
    .split("/"); // [DD, MM, YYYY]

  const [DD, MM, YYYY] = dd;
  return `${YYYY}-${MM}-${DD}`; // "YYYY-MM-DD"
}

// Helper: build IST midnight timestamp to avoid UTC shift
function istMidnightISO(dateInput /* "YYYY-MM-DD" */) {
  return `${dateInput}T00:00:00+05:30`;
}

const IncomeForm = ({ isOpen, onClose, income }) => {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [tag, setTag] = useState("");
  const [creditedAt, setCreditedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Light/Dark modal surfaces
  const modalBg = useColorModeValue("white", "gray.800");
  const modalColor = useColorModeValue("gray.900", "gray.100");

  useEffect(() => {
    if (income) {
      setAmount(String(income.amount ?? ""));
      setSource(income.source || "");
      setTag(income.tag || "");
      setCreditedAt(
        income.creditedAt ? toISTDateInputValue(income.creditedAt) : ""
      );
    } else {
      setAmount("");
      setSource("");
      setTag("");
      setCreditedAt("");
    }
  }, [income]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Amount must be a positive number", status: "error" });
      return;
    }
    if (!source) {
      toast({ title: "Please select a source", status: "error" });
      return;
    }
    if (!creditedAt) {
      toast({ title: "Please pick a date", status: "error" });
      return;
    }

    const creditedAtISO = istMidnightISO(creditedAt);
    const data = { amount: amt, source, tag, creditedAt: creditedAtISO };

    try {
      setSubmitting(true);

      if (income?.id) {
        // ✅ correct route (plural)
        await axiosClient.put(`/incomes/${income.id}`, data);
        toast({ title: "Income updated", status: "success" });
      } else {
        // ✅ correct route (plural)
        await axiosClient.post("/incomes", data);
        toast({ title: "Income added", status: "success" });
      }

      onClose(); // parent refreshes on close
    } catch (error) {
      toast({
        title: "Error occurred",
        description: error?.response?.data?.message || error.message,
        status: "error",
      });
      console.error("Income form submission error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent bg={modalBg} color={modalColor}>
        <ModalHeader>{income ? "Edit Income" : "Add Income"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <form id="income-form" onSubmit={handleSubmit}>
            <FormControl mb={4} isRequired>
              <FormLabel>Amount (₹)</FormLabel>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>Source</FormLabel>
              <Select
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">Select source</option>
                <option value="Salary">Salary</option>
                <option value="Gift">Gift</option>
                <option value="External">External</option>
              </Select>
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Tag (optional)</FormLabel>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Bonus, Freelance, etc."
              />
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>Date</FormLabel>
              <Input
                type="date"
                value={creditedAt}
                onChange={(e) => setCreditedAt(e.target.value)}
              />
            </FormControl>
          </form>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="teal"
            mr={3}
            type="submit"
            form="income-form"
            isLoading={submitting}
            loadingText={income ? "Updating..." : "Adding..."}
          >
            {income ? "Update" : "Add"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default IncomeForm;
