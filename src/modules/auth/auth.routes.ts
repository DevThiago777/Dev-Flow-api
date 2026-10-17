import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middlewares/require-auth";
import { asyncHandler } from "../../utils/async-handler";
import { comparePassword, hashPassword, signToken } from "../../utils/auth";
import { HttpError } from "../../utils/http-error";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

function toPublicUser(user: { id: string; name: string; email: string; avatarUrl: string | null; role: string }) {
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role };
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new HttpError(409, "Email already in use");

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash },
    });

    const token = signToken({ sub: user.id });
    res.status(201).json({ token, user: toPublicUser(user) });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new HttpError(401, "Invalid credentials");

    const valid = await comparePassword(data.password, user.passwordHash);
    if (!valid) throw new HttpError(401, "Invalid credentials");

    const token = signToken({ sub: user.id });
    res.json({ token, user: toPublicUser(user) });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
    res.json({ user: toPublicUser(user) });
  })
);

authRouter.put(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateMeSchema.parse(req.body);
    const current = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });

    if (data.email && data.email !== current.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new HttpError(409, "Email already in use");
    }

    let passwordHash: string | undefined;
    if (data.newPassword) {
      if (!data.currentPassword) throw new HttpError(400, "Informe a senha atual para defini-la novamente");
      const valid = await comparePassword(data.currentPassword, current.passwordHash);
      if (!valid) throw new HttpError(401, "Senha atual incorreta");
      passwordHash = await hashPassword(data.newPassword);
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl === "" ? null : data.avatarUrl,
        passwordHash,
      },
    });

    res.json({ user: toPublicUser(user) });
  })
);
