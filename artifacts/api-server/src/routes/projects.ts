import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { CreateProjectBody, UpdateProjectBody } from "@workspace/api-zod";
import { clientProjects, db } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";

const router: IRouter = Router();

router.use("/projects", requireAuth);

router.get("/projects", async (req, res, next) => {
  try {
    const ownerId = getAuth(req).userId!;
    const projects = await db
      .select({
        id: clientProjects.id,
        name: clientProjects.name,
        description: clientProjects.description,
        knowledge: clientProjects.knowledge,
        createdAt: clientProjects.createdAt,
        updatedAt: clientProjects.updatedAt,
      })
      .from(clientProjects)
      .where(eq(clientProjects.ownerId, ownerId))
      .orderBy(desc(clientProjects.updatedAt));

    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

router.post("/projects", async (req, res, next) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid project", details: parsed.error.message });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    const [project] = await db
      .insert(clientProjects)
      .values({
        ownerId,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() ?? "",
      })
      .returning({
        id: clientProjects.id,
        name: clientProjects.name,
        description: clientProjects.description,
        knowledge: clientProjects.knowledge,
        createdAt: clientProjects.createdAt,
        updatedAt: clientProjects.updatedAt,
      });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

router.get("/projects/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    const [project] = await db
      .select({
        id: clientProjects.id,
        name: clientProjects.name,
        description: clientProjects.description,
        knowledge: clientProjects.knowledge,
        createdAt: clientProjects.createdAt,
        updatedAt: clientProjects.updatedAt,
      })
      .from(clientProjects)
      .where(and(eq(clientProjects.id, id), eq(clientProjects.ownerId, ownerId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
});

router.patch("/projects/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!Number.isInteger(id) || id < 1) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({
      error: "Invalid project update.",
      details: parsed.success ? "Provide at least one field to update." : parsed.error.message,
    });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    const update = {
      ...parsed.data,
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description.trim() }
        : {}),
      updatedAt: new Date(),
    };
    const [project] = await db
      .update(clientProjects)
      .set(update)
      .where(and(eq(clientProjects.id, id), eq(clientProjects.ownerId, ownerId)))
      .returning({
        id: clientProjects.id,
        name: clientProjects.name,
        description: clientProjects.description,
        knowledge: clientProjects.knowledge,
        createdAt: clientProjects.createdAt,
        updatedAt: clientProjects.updatedAt,
      });

    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
});

router.delete("/projects/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    const deleted = await db
      .delete(clientProjects)
      .where(and(eq(clientProjects.id, id), eq(clientProjects.ownerId, ownerId)))
      .returning({ id: clientProjects.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
