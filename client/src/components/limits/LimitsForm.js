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
} from "@chakra-ui/react";
import axiosClient from "../../api/axiosClient";

const categoryOptions = [
  "Food",
  "Rent",
  "Petrol",
  "Groceries",
  "Online Shopping",
  "Entertainment",
  "Self Care",
  "Friends & Family",
  "Miscellaneous",
  "Subscriptions",
];

const LimitsForm = ({ isOpen, onClose, limits }) => {
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [weeklyLimit, setWeeklyLimit] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [effectiveMonth, setEffectiveMonth] = useState("");
  const [week, setWeek] = useState("");
  const [category, setCategory] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (limits) {
      setCategory(limits.category || "");
      setMonthlyLimit(limits.monthlyLimit || "");
      setWeeklyLimit(limits.weeklyLimit || "");
      setDailyLimit(limits.dailyLimit || "");
      setEffectiveMonth(limits.effectiveMonth || "");
      setWeek(limits.week || "");
    } else {
      setCategory("");
      setMonthlyLimit("");
      setWeeklyLimit("");
      setDailyLimit("");
      setEffectiveMonth("");
      setWeek("");
    }
  }, [limits]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        monthlyLimit: Number(monthlyLimit),
        weeklyLimit: Number(weeklyLimit),
        dailyLimit: Number(dailyLimit),
        effectiveMonth,
        week: week ? Number(week) : undefined,
        category,
      };
      if (limits) {
        await axiosClient.put(`/limits/${limits.id}`, data);
        toast({ title: "Limits updated", status: "success" });
      } else {
        await axiosClient.post("/limits", data);
        toast({ title: "Limits set", status: "success" });
      }
      onClose();
    } catch (error) {
      toast({ title: "Error", description: error.message, status: "error" });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{limits ? "Edit Limits" : "Set Limits"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <form id="limits-form" onSubmit={handleSubmit}>
            <FormControl mb={4} isRequired>
              <FormLabel>Category</FormLabel>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select category</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl mb={4} isRequired>
              <FormLabel>Monthly Limit (₹)</FormLabel>
              <Input
                type="number"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                min={0}
              />
            </FormControl>
            <FormControl mb={4} isRequired>
              <FormLabel>Weekly Limit (₹)</FormLabel>
              <Input
                type="number"
                value={weeklyLimit}
                onChange={(e) => setWeeklyLimit(e.target.value)}
                min={0}
              />
            </FormControl>
            <FormControl mb={4} isRequired>
              <FormLabel>Daily Limit (₹)</FormLabel>
              <Input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                min={0}
              />
            </FormControl>
            <FormControl mb={4} isRequired>
              <FormLabel>Month (e.g. Sep-2025)</FormLabel>
              <Input
                value={effectiveMonth}
                onChange={(e) => setEffectiveMonth(e.target.value)}
                placeholder="e.g. Sep-2025"
              />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Week (optional)</FormLabel>
              <Input
                type="number"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                min={1}
                max={5}
                placeholder="Week number"
              />
            </FormControl>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="teal" mr={3} type="submit" form="limits-form">
            {limits ? "Update" : "Set"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LimitsForm;



