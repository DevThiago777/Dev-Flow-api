import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: { email: "thiago@devthiago.com" },
    update: {},
    create: {
      name: "Thiago",
      email: "thiago@devthiago.com",
      passwordHash,
      role: "admin",
      avatarUrl: "https://i.pravatar.cc/100?img=12",
    },
  });

  const teammate = await prisma.user.upsert({
    where: { email: "ana@devthiago.com" },
    update: {},
    create: {
      name: "Ana Souza",
      email: "ana@devthiago.com",
      passwordHash,
      role: "member",
      avatarUrl: "https://i.pravatar.cc/100?img=47",
    },
  });

  const clientA = await prisma.client.upsert({
    where: { id: "seed-client-a" },
    update: {},
    create: {
      id: "seed-client-a",
      name: "Carlos Mendes",
      company: "Docker Co.",
      email: "carlos@dockerco.com",
      phone: "+55 11 99999-0001",
      avatarUrl: "https://i.pravatar.cc/100?img=5",
    },
  });

  const clientB = await prisma.client.upsert({
    where: { id: "seed-client-b" },
    update: {},
    create: {
      id: "seed-client-b",
      name: "Beatriz Lima",
      company: "Retool Inc.",
      email: "beatriz@retool.com",
      phone: "+55 11 99999-0002",
      avatarUrl: "https://i.pravatar.cc/100?img=32",
    },
  });

  const projectA = await prisma.project.upsert({
    where: { id: "seed-project-a" },
    update: {},
    create: {
      id: "seed-project-a",
      name: "Docker",
      subtitle: "Landing Page Design",
      icon: "container",
      color: "#f97316",
      budget: 5400,
      deadline: new Date("2024-10-12"),
      status: "in_progress",
      progressPct: 65,
      clientId: clientA.id,
      members: { create: [{ userId: owner.id }, { userId: teammate.id }] },
      tasks: {
        create: Array.from({ length: 5 }).map((_, i) => ({ title: `Task ${i + 1}`, done: i < 2 })),
      },
    },
  });

  const projectB = await prisma.project.upsert({
    where: { id: "seed-project-b" },
    update: {},
    create: {
      id: "seed-project-b",
      name: "Retool",
      subtitle: "One Page SEO",
      icon: "layers",
      color: "#22c55e",
      budget: 2700,
      deadline: new Date("2024-09-28"),
      status: "completed",
      progressPct: 100,
      clientId: clientB.id,
      members: { create: [{ userId: owner.id }] },
      tasks: { create: [{ title: "SEO audit", done: true }] },
    },
  });

  const today = new Date();
  const startA = new Date(today);
  startA.setHours(7, 15, 0, 0);
  const endA = new Date(today);
  endA.setHours(9, 0, 0, 0);

  const startB = new Date(today);
  startB.setHours(9, 15, 0, 0);
  const endB = new Date(today);
  endB.setHours(10, 0, 0, 0);

  await prisma.calendarEvent.createMany({
    data: [
      { title: "Meeting with Design Team", startAt: startA, endAt: endA, ownerId: owner.id },
      { title: "Giving feedback to the New Saas Product", startAt: startB, endAt: endB, ownerId: owner.id },
    ],
    skipDuplicates: true,
  });

  const earningsData = [
    { day: 5, earning: 7200, expense: 3800 },
    { day: 10, earning: 7800, expense: 4500 },
    { day: 15, earning: 6400, expense: 3600 },
    { day: 20, earning: 7000, expense: 4200 },
    { day: 25, earning: 8000, expense: 4800 },
    { day: 30, earning: 6600, expense: 4000 },
  ];

  for (const point of earningsData) {
    const date = new Date(today.getFullYear(), today.getMonth(), point.day);
    await prisma.transaction.create({
      data: { type: "earning", amount: point.earning, description: "Client payment", date },
    });
    await prisma.transaction.create({
      data: { type: "expense", amount: point.expense, description: "Operating costs", date },
    });
  }

  await prisma.invoice.upsert({
    where: { number: "INV-1001" },
    update: {},
    create: { number: "INV-1001", amount: 5400, status: "sent", dueDate: new Date("2024-10-12"), clientId: clientA.id },
  });

  await prisma.invoice.upsert({
    where: { number: "INV-1002" },
    update: {},
    create: { number: "INV-1002", amount: 2700, status: "paid", dueDate: new Date("2024-09-28"), clientId: clientB.id },
  });

  await prisma.supportTicket.createMany({
    data: [
      {
        subject: "Login issue after password reset",
        description: "Client cannot log in after resetting the password.",
        status: "open",
        priority: "high",
        requesterId: owner.id,
      },
      {
        subject: "Invoice PDF not generating",
        description: "Invoice export returns an empty PDF.",
        status: "pending",
        priority: "medium",
        requesterId: owner.id,
      },
    ],
  });

  console.log("Seed completed:", { owner: owner.email, projectA: projectA.name, projectB: projectB.name });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
