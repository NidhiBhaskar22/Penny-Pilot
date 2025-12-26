import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { applyBalanceChange } from "../utils/balanceUtils.js";

// ---- Controller functions ----

export const createEMI = async (req, res) => {
  try {
    const {
      title,
      totalAmount,
      numInstallments,
      startDate,
      userId,
      linkedLoanId,
    } = req.body;
    const emiAmount = totalAmount / numInstallments;

    const emi = await prisma.eMI.create({
      data: {
        title,
        totalAmount,
        numInstallments,
        emiAmount,
        amountPaid: 0,
        remaininginstallments: numInstallments, // ✅ Match your schema field name
        startDate: new Date(startDate),
        userId,
        linkedLoanId,
      },
    });

    // lock full EMI amount immediately
    await applyBalanceChange(userId, -totalAmount);

    res.json(emi);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create EMI", details: err.message });
  }
};

export const payEMIInstallment = async (req, res) => {
  try {
    const { emiId, amount } = req.body;

    const emi = await prisma.eMI.findUnique({ where: { id: emiId } });
    if (!emi) return res.status(404).json({ error: "EMI not found" });

    if (emi.remaininginstallments <= 0)
      return res.status(400).json({ error: "All installments already paid" });

    const updatedEMI = await prisma.eMI.update({
      where: { id: emiId },
      data: {
        amountPaid: { increment: amount },
        remaininginstallments: { decrement: 1 },
      },
    });

    await applyBalanceChange(emi.userId, -amount);

    res.json(updatedEMI);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to pay EMI installment", details: err.message });
  }
};

export const getAllEMIs = async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const emis = await prisma.eMI.findMany({
      where: { userId },
    });
    res.json(emis);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch EMIs", details: err.message });
  }
};

export const deleteEMI = async (req, res) => {
  try {
    const { id } = req.params;
    const emi = await prisma.eMI.findUnique({ where: { id: parseInt(id) } });
    if (!emi) return res.status(404).json({ error: "EMI not found" });

    const remaining = emi.totalAmount - emi.amountPaid;

    await prisma.eMI.delete({ where: { id: parseInt(id) } });

    // refund remaining to user balance
    if (remaining > 0) {
      await applyBalanceChange(emi.userId, remaining);
    }

    res.json({ message: "EMI deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete EMI", details: err.message });
  }
};
