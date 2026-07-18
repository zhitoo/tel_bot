import ExcelJS from "exceljs";
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

function serializeUser(user: {
  id: string;
  telegramUserId: bigint;
  telegramUsername: string | null;
  firstName: string;
  lastName: string;
  mobile: string;
  mobileSource: string;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; title: string } | null;
}) {
  return {
    ...user,
    telegramUserId: user.telegramUserId.toString(),
  };
}

export default async function usersRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get<{
    Querystring: { search?: string; categoryId?: string; page?: string; pageSize?: string };
  }>("/api/users", async (req) => {
    const { search, categoryId, page = "1", pageSize = "20" } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { mobile: { contains: search } },
              { telegramUsername: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { category: true },
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: items.map(serializeUser),
      total,
      page: Number(page) || 1,
      pageSize: take,
    };
  });

  app.get<{ Params: { id: string } }>("/api/users/:id", async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!user) return reply.code(404).send({ error: "User not found" });
    return serializeUser(user);
  });

  app.delete<{ Params: { id: string } }>("/api/users/:id", async (req, reply) => {
    await prisma.user.delete({ where: { id: req.params.id } }).catch(() => null);
    return reply.code(204).send();
  });

  app.get("/api/users/export", async (req, reply) => {
    const users = await prisma.user.findMany({
      include: { category: true },
      orderBy: { createdAt: "asc" },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Users");
    sheet.columns = [
      { header: "نام", key: "firstName", width: 20 },
      { header: "نام خانوادگی", key: "lastName", width: 20 },
      { header: "موبایل", key: "mobile", width: 18 },
      { header: "حوزه فعالیت", key: "category", width: 24 },
      { header: "یوزرنیم تلگرام", key: "telegramUsername", width: 20 },
      { header: "تاریخ ثبت", key: "createdAt", width: 22 },
      { header: "آخرین به‌روزرسانی", key: "updatedAt", width: 22 },
    ];

    for (const user of users) {
      sheet.addRow({
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        category: user.category?.title ?? "",
        telegramUsername: user.telegramUsername ?? "",
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    reply
      .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .header("Content-Disposition", "attachment; filename=users.xlsx")
      .send(buffer);
  });
}
