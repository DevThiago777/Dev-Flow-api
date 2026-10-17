import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/async-handler";
import { HttpError } from "../../utils/http-error";

export const projectsRouter = Router();

const projectInclude = {
  client: true,
  members: { include: { user: true } },
  tasks: true,
};

function serializeProject(project: any) {
  return {
    id: project.id,
    name: project.name,
    subtitle: project.subtitle,
    icon: project.icon,
    color: project.color,
    budget: Number(project.budget),
    deadline: project.deadline,
    status: project.status,
    progressPct: project.progressPct,
    client: project.client ? { id: project.client.id, name: project.client.name, company: project.client.company } : null,
    members: project.members.map((m: any) => ({ id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl })),
    taskCount: project.tasks.length,
    tasksDone: project.tasks.filter((t: any) => t.done).length,
  };
}

const upsertSchema = z.object({
  name: z.string().min(1),
  subtitle: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  budget: z.number().nonnegative(),
  deadline: z.string().datetime().optional(),
  status: z.enum(["in_progress", "completed", "on_hold"]).optional(),
  progressPct: z.number().min(0).max(100).optional(),
  clientId: z.string().optional().nullable(),
  memberIds: z.array(z.string()).optional(),
});

projectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const projects = await prisma.project.findMany({
      where: {
        status: status && status !== "all" ? (status as any) : undefined,
        name: search ? { contains: search, mode: "insensitive" } : undefined,
      },
      include: projectInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json(projects.map(serializeProject));
  })
);

projectsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: projectInclude });
    if (!project) throw new HttpError(404, "Project not found");
    res.json(serializeProject(project));
  })
);

projectsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = upsertSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        name: data.name,
        subtitle: data.subtitle,
        icon: data.icon ?? "folder",
        color: data.color ?? "#3b82f6",
        budget: data.budget,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        status: data.status ?? "in_progress",
        progressPct: data.progressPct ?? 0,
        clientId: data.clientId ?? undefined,
        members: data.memberIds ? { create: data.memberIds.map((userId) => ({ userId })) } : undefined,
      },
      include: projectInclude,
    });

    res.status(201).json(serializeProject(project));
  })
);

projectsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = upsertSchema.partial().parse(req.body);
    const { memberIds, ...rest } = data;

    if (memberIds) {
      await prisma.projectMember.deleteMany({ where: { projectId: req.params.id } });
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        members: memberIds ? { create: memberIds.map((userId) => ({ userId })) } : undefined,
      },
      include: projectInclude,
    });

    res.json(serializeProject(project));
  })
);

projectsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
