import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/async-handler";
import { HttpError } from "../../utils/http-error";

export const clientsRouter = Router();

const upsertSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  status: z.string().optional(),
});

clientsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = req.query.search as string | undefined;
    const clients = await prisma.client.findMany({
      where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { projects: true, invoices: true } } },
    });
    res.json(clients);
  })
);

clientsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client) throw new HttpError(404, "Client not found");
    res.json(client);
  })
);

clientsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = upsertSchema.parse(req.body);
    const client = await prisma.client.create({ data: { ...data, email: data.email || undefined } });
    res.status(201).json(client);
  })
);

clientsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = upsertSchema.partial().parse(req.body);
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { ...data, email: data.email || undefined },
    });
    res.json(client);
  })
);

clientsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
