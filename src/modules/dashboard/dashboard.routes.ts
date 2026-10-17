import { Router } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/async-handler";

export const dashboardRouter = Router();

function startOfMonth(date: Date, offset = 0) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(now, -1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const [
      projectsTotal,
      projectsThisMonth,
      projectsLastMonth,
      clientsTotal,
      clientsThisMonth,
      clientsLastMonth,
      earningsThisMonth,
      earningsLastMonth,
      monthTransactions,
      todayEvents,
      recentProjects,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { createdAt: { gte: thisMonthStart } } }),
      prisma.project.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
      prisma.client.count(),
      prisma.client.count({ where: { createdAt: { gte: thisMonthStart } } }),
      prisma.client.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
      prisma.transaction.aggregate({
        where: { type: "earning", date: { gte: thisMonthStart } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: "earning", date: { gte: lastMonthStart, lt: thisMonthStart } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({ where: { date: { gte: thisMonthStart } }, orderBy: { date: "asc" } }),
      prisma.calendarEvent.findMany({
        where: { startAt: { gte: dayStart, lt: dayEnd } },
        include: { owner: true, attendees: true },
        orderBy: { startAt: "asc" },
      }),
      prisma.project.findMany({
        include: { client: true, members: { include: { user: true } }, tasks: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const earningsBuckets = new Map<string, { earning: number; expense: number }>();
    for (const t of monthTransactions) {
      const key = t.date.toISOString().slice(0, 10);
      const bucket = earningsBuckets.get(key) ?? { earning: 0, expense: 0 };
      if (t.type === "earning") bucket.earning += Number(t.amount);
      else bucket.expense += Number(t.amount);
      earningsBuckets.set(key, bucket);
    }

    const earningsSeries = Array.from(earningsBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));

    const totalEarning = earningsSeries.reduce((sum, p) => sum + p.earning, 0);
    const totalExpense = earningsSeries.reduce((sum, p) => sum + p.expense, 0);

    const revenueThisMonth = Number(earningsThisMonth._sum.amount ?? 0);
    const revenueLastMonth = Number(earningsLastMonth._sum.amount ?? 0);

    res.json({
      kpis: {
        projects: { total: projectsTotal, deltaPct: percentDelta(projectsThisMonth, projectsLastMonth) },
        clients: { total: clientsTotal, deltaPct: percentDelta(clientsThisMonth, clientsLastMonth) },
        revenue: { total: revenueThisMonth, deltaPct: percentDelta(revenueThisMonth, revenueLastMonth) },
      },
      earnings: {
        series: earningsSeries,
        totalEarning,
        totalExpense,
        totalRevenue: totalEarning - totalExpense,
      },
      todayEvents: todayEvents.map((e) => ({
        id: e.id,
        title: e.title,
        startAt: e.startAt,
        endAt: e.endAt,
        attendees: [e.owner, ...e.attendees].map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl })),
      })),
      recentProjects: recentProjects.map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle,
        icon: p.icon,
        color: p.color,
        budget: Number(p.budget),
        deadline: p.deadline,
        status: p.status,
        progressPct: p.progressPct,
        members: p.members.map((m) => ({ id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl })),
        taskCount: p.tasks.length,
      })),
    });
  })
);
