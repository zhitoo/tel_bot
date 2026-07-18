import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export default async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { username: string; password: string } }>("/api/auth/login", async (req, reply) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return reply.code(400).send({ error: "username and password are required" });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = app.jwt.sign(
      { adminId: admin.id, username: admin.username },
      { expiresIn: "12h" },
    );

    return reply.send({ token });
  });
}
