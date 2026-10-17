import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/async-handler";

export const financeRouter = Router();

const transactionSchema = z.object({
  type: z.enum(["earning", "expense"]),
  amount: z.number().positive(),
  description: z.string().min(1),
  category: z.string().optional(),
  date: z.string().datetime().optional(),
});

financeRouter.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({ orderBy: { date: "desc" } });
    res.json(transactions.map((t) => ({ ...t, amount: Number(t.amount) })));
  })
);

financeRouter.post(
  "/transactions",
  asyncHandler(async (req, res) => {
    const data = transactionSchema.parse(req.body);
    const transaction = await prisma.transaction.create({
      data: { ...data, date: data.date ? new Date(data.date) : undefined },
    });
    res.status(201).json({ ...transaction, amount: Number(transaction.amount) });
  })
);

financeRouter.delete(
  "/transactions/:id",
  asyncHandler(async (req, res) => {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

const invoiceSchema = z.object({
  number: z.string().min(1),
  amount: z.number().positive(),
  status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  dueDate: z.string().datetime(),
  clientId: z.string().min(1),
});

financeRouter.get(
  "/invoices",
  asyncHandler(async (req, res) => {
    const invoices = await prisma.invoice.findMany({ include: { client: true }, orderBy: { createdAt: "desc" } });
    res.json(
      invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amount: Number(inv.amount),
        status: inv.status,
        dueDate: inv.dueDate,
        client: { id: inv.client.id, name: inv.client.name, company: inv.client.company },
      }))
    );
  })
);

financeRouter.post(
  "/invoices",
  asyncHandler(async (req, res) => {
    const data = invoiceSchema.parse(req.body);
    const invoice = await prisma.invoice.create({
      data: { ...data, dueDate: new Date(data.dueDate) },
      include: { client: true },
    });
    res.status(201).json({ ...invoice, amount: Number(invoice.amount) });
  })
);

financeRouter.put(
  "/invoices/:id",
  asyncHandler(async (req, res) => {
    const data = invoiceSchema.partial().parse(req.body);
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
      include: { client: true },
    });
    res.json({ ...invoice, amount: Number(invoice.amount) });
  })
);

financeRouter.delete(
  "/invoices/:id",
  asyncHandler(async (req, res) => {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
