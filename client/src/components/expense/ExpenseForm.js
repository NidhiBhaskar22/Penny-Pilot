import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  useColorModeValue,
} from "@chakra-ui/react";
import axiosClient from "../../api/axiosClient";

const ExpenseForm = ({ isOpen, onClose, expense }) => {
  const [amount, setAmount] = useState("");
  const [tag, setTag] = useState("");
  const [spentAt, setSpentAt] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const toast = useToast();

  const modalBg = useColorModeValue("white", "gray.800");
  const modalColor = useColorModeValue("gray.900", "whiteAlpha.900");

  const fieldBg = useColorModeValue("white", "gray.700");
  const fieldText = useColorModeValue("gray.900", "whiteAlpha.900");
  const fieldBorder = useColorModeValue("gray.200", "whiteAlpha.300");
  const fieldBorderHov = useColorModeValue("gray.300", "whiteAlpha.400");
  const placeholder = useColorModeValue("gray.500", "whiteAlpha.600");
  const focusBorder = useColorModeValue("red.400", "red.300"); // match your expenses accent

  // helper to apply consistent styles to inputs/selects
  const fieldProps = {
    bg: fieldBg,
    color: fieldText,
    borderColor: fieldBorder,
    _hover: { borderColor: fieldBorderHov },
    _placeholder: { color: placeholder },
    focusBorderColor: focusBorder,
  };

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount);
      setTag(expense.tag || "");
      setSpentAt(
        expense.spentAt
          ? new Date(expense.spentAt).toISOString().split("T")[0]
          : ""
      );
    } else {
      setAmount("");
      setTag("");
      setSpentAt("");
    }
  }, [expense]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !tag || !spentAt) {
      toast({
        title: "Please fill all required fields",
        status: "error",
      });
      return;
    }
    const spentAtISO = new Date(spentAt).toISOString();

    // Add month and week calculation before submit
    const d = new Date(spentAt);
    const month =
      d.toLocaleString("default", { month: "short" }) + "-" + d.getFullYear();
    // ISO week calculation (simple version)
    const week = Math.ceil(
      (d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7
    );

    const data = {
      amount: Number(amount),
      tag,
      spentAt: spentAtISO,
      month,
      week,
    };
    try {
      if (expense) {
        await axiosClient.put(`/expenses/${expense.id}`, data);
        toast({ title: "Expense updated", status: "success" });
      } else {
        await axiosClient.post("/expenses", data);
        toast({ title: "Expense added", status: "success" });
      }
      onClose();
    } catch (error) {
      toast({
        title: "Error occurred",
        description: error?.response?.data?.message || error.message,
        status: "error",
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      {/* 👇 This makes all text inside white in dark mode */}
      <ModalContent bg={modalBg} color={modalColor}>
        <ModalHeader>{expense ? "Edit Expense" : "Add Expense"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <form id="expense-form" onSubmit={handleSubmit}>
            <FormControl mb={4} isRequired>
              <FormLabel>Amount (₹)</FormLabel>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                {...fieldProps}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>Category Tag</FormLabel>
              <Select
                {...fieldProps}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select</option>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Groceries">Groceries</option>
                {/* ... */}
              </Select>
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>Date</FormLabel>
              <Input
                type="date"
                {...fieldProps}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </FormControl>
          </form>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="red" mr={3} type="submit" form="expense-form">
            {expense ? "Update" : "Add"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
export default ExpenseForm;
