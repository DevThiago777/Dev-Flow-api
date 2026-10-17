import { Router } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/async-handler";

export const usersRouter = Router();

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  })
);
