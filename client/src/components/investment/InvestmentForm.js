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

const InvestmentForm = ({ isOpen, onClose, investment }) => {
  const [amount, setAmount] = useState("");
  const [instrument, setInstrument] = useState("");
  const [investedDate, setInvestedDate] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (investment) {
      setAmount(investment.amount);
      setInstrument(investment.instrument || "");
      setInvestedDate(
        investment.investedDate ? investment.investedDate.split("T")[0] : ""
      );
    } else {
      setAmount("");
      setInstrument("");
      setInvestedDate("");
    }
  }, [investment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { amount: Number(amount), instrument, investedDate };
      if (investment) {
        await axiosClient.put(`/investments/${investment.id}`, data);
        toast({ title: "Investment updated", status: "success" });
      } else {
        await axiosClient.post("/investments", data);
        toast({ title: "Investment added", status: "success" });
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
        <ModalHeader>
          {investment ? "Edit Investment" : "Add Investment"}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <form id="investment-form" onSubmit={handleSubmit}>
            <FormControl mb={4} isRequired>
              <FormLabel>Amount (₹)</FormLabel>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={1}
              />
            </FormControl>
            <FormControl mb={4} isRequired>
              <FormLabel>Instrument</FormLabel>
              <Select
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
              >
                <option value="">Select instrument</option>
                <option value="SIP">SIP</option>
                <option value="Stocks">Stocks</option>
                <option value="Lump-sum">Lump-sum</option>
              </Select>
            </FormControl>
            <FormControl mb={4} isRequired>
              <FormLabel>Date</FormLabel>
              <Input
                type="date"
                value={investedDate}
                onChange={(e) => setInvestedDate(e.target.value)}
              />
            </FormControl>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="blue"
            mr={3}
            type="submit"
            form="investment-form"
          >
            {investment ? "Update" : "Add"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default InvestmentForm;
