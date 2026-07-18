import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads");

export default async function categoriesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/api/categories", async () => {
    return prisma.category.findMany({
      include: { file: true },
      orderBy: { sortOrder: "asc" },
    });
  });

  app.post<{ Body: { title: string; sortOrder?: number; isActive?: boolean } }>(
    "/api/categories",
    async (req, reply) => {
      const { title, sortOrder = 0, isActive = true } = req.body ?? {};
      if (!title?.trim()) {
        return reply.code(400).send({ error: "title is required" });
      }
      const category = await prisma.category.create({
        data: { title: title.trim(), sortOrder, isActive },
      });
      return reply.code(201).send(category);
    },
  );

  app.patch<{ Params: { id: string }; Body: { title?: string; sortOrder?: number; isActive?: boolean } }>(
    "/api/categories/:id",
    async (req, reply) => {
      const { id } = req.params;
      const { title, sortOrder, isActive } = req.body ?? {};
      const category = await prisma.category
        .update({
          where: { id },
          data: {
            ...(title !== undefined ? { title: title.trim() } : {}),
            ...(sortOrder !== undefined ? { sortOrder } : {}),
            ...(isActive !== undefined ? { isActive } : {}),
          },
        })
        .catch(() => null);
      if (!category) {
        return reply.code(404).send({ error: "Category not found" });
      }
      return category;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/categories/:id", async (req, reply) => {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } }).catch(() => null);
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/categories/:id/file", async (req, reply) => {
    const { id } = req.params;
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return reply.code(404).send({ error: "Category not found" });
    }

    const uploaded = await req.file();
    if (!uploaded) {
      return reply.code(400).send({ error: "No file uploaded" });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const storedName = `${randomUUID()}-${uploaded.filename}`;
    const storagePath = path.join(UPLOAD_DIR, storedName);
    const buffer = await uploaded.toBuffer();
    await writeFile(storagePath, buffer);

    const file = await prisma.file.create({
      data: {
        originalName: uploaded.filename,
        storagePath,
      },
    });

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { fileId: file.id },
      include: { file: true },
    });

    return reply.code(201).send(updatedCategory);
  });
}
