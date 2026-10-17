import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/async-handler";
import { HttpError } from "../../utils/http-error";

export const calendarRouter = Router();

const eventInclude = { owner: true, attendees: true };

function serializeEvent(event: any) {
  return {
    id: event.id,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    owner: { id: event.owner.id, name: event.owner.name, avatarUrl: event.owner.avatarUrl },
    attendees: event.attendees.map((u: any) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl })),
  };
}

const upsertSchema = z.object({
  title: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  attendeeIds: z.array(z.string()).optional(),
});

calendarRouter.get(
  "/events",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const events = await prisma.calendarEvent.findMany({
      where: {
        startAt: from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
      },
      include: eventInclude,
      orderBy: { startAt: "asc" },
    });
    res.json(events.map(serializeEvent));
  })
);

calendarRouter.post(
  "/events",
  asyncHandler(async (req, res) => {
    const data = upsertSchema.parse(req.body);
    if (!req.userId) throw new HttpError(401, "Unauthorized");

    const event = await prisma.calendarEvent.create({
      data: {
        title: data.title,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        ownerId: req.userId,
        attendees: data.attendeeIds ? { connect: data.attendeeIds.map((id) => ({ id })) } : undefined,
      },
      include: eventInclude,
    });

    res.status(201).json(serializeEvent(event));
  })
);

calendarRouter.put(
  "/events/:id",
  asyncHandler(async (req, res) => {
    const data = upsertSchema.partial().parse(req.body);

    if (data.attendeeIds) {
      await prisma.calendarEvent.update({ where: { id: req.params.id }, data: { attendees: { set: [] } } });
    }

    const event = await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: {
        title: data.title,
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        endAt: data.endAt ? new Date(data.endAt) : undefined,
        attendees: data.attendeeIds ? { connect: data.attendeeIds.map((id) => ({ id })) } : undefined,
      },
      include: eventInclude,
    });

    res.json(serializeEvent(event));
  })
);

calendarRouter.delete(
  "/events/:id",
  asyncHandler(async (req, res) => {
    await prisma.calendarEvent.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
