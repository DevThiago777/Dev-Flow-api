import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/error-handler";
import { requireAuth } from "./middlewares/require-auth";
import { authRouter } from "./modules/auth/auth.routes";
import { calendarRouter } from "./modules/calendar/calendar.routes";
import { clientsRouter } from "./modules/clients/clients.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { financeRouter } from "./modules/finance/finance.routes";
import { projectsRouter } from "./modules/projects/projects.routes";
import { supportRouter } from "./modules/support/support.routes";
import { usersRouter } from "./modules/users/users.routes";

export const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRouter);
app.use("/dashboard", requireAuth, dashboardRouter);
app.use("/projects", requireAuth, projectsRouter);
app.use("/clients", requireAuth, clientsRouter);
app.use("/calendar", requireAuth, calendarRouter);
app.use("/finance", requireAuth, financeRouter);
app.use("/support", requireAuth, supportRouter);
app.use("/users", requireAuth, usersRouter);

app.use(errorHandler);
