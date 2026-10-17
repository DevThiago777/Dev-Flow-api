import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/async-handler";
import { HttpError } from "../../utils/http-error";

export const supportRouter = Router();

const upsertSchema = z.object({
  subject: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(["open", "pending", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

supportRouter.get(
  "/tickets",
  asyncHandler(async (req, res) => {
    const tickets = await prisma.supportTicket.findMany({
      include: { requester: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
        requester: { id: t.requester.id, name: t.requester.name, avatarUrl: t.requester.avatarUrl },
      }))
    );
  })
);

supportRouter.get(
  "/tickets/:id",
  asyncHandler(async (req, res) => {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: { requester: true },
    });
    if (!ticket) throw new HttpError(404, "Ticket not found");
    res.json(ticket);
  })
);

supportRouter.post(
  "/tickets",
  asyncHandler(async (req, res) => {
    const data = upsertSchema.parse(req.body);
    if (!req.userId) throw new HttpError(401, "Unauthorized");

    const ticket = await prisma.supportTicket.create({
      data: { ...data, requesterId: req.userId },
    });
    res.status(201).json(ticket);
  })
);

supportRouter.put(
  "/tickets/:id",
  asyncHandler(async (req, res) => {
    const data = upsertSchema.partial().parse(req.body);
    const ticket = await prisma.supportTicket.update({ where: { id: req.params.id }, data });
    res.json(ticket);
  })
);

supportRouter.delete(
  "/tickets/:id",
  asyncHandler(async (req, res) => {
    await prisma.supportTicket.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
