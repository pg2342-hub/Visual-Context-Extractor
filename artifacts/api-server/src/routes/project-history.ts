import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  CreateProjectFindingBody,
  CreateProjectFindingParams,
  GetProjectAnalysisRunParams,
  GetProjectAnalysisRunResponse,
  ListProjectAnalysisRunsParams,
  ListProjectAnalysisRunsResponse,
  ListProjectFindingsParams,
  ListProjectFindingsResponse,
  UpdateProjectFindingBody,
  UpdateProjectFindingParams,
  UpdateProjectFindingResponse,
} from "@workspace/api-zod";
import {
  clientProjectAnalysisRuns,
  clientProjectFindings,
  clientProjects,
  db,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";

const router: IRouter = Router();

router.use("/projects", requireAuth);

async function getOwnedProject(projectId: number, ownerId: string) {
  const [project] = await db
    .select({ id: clientProjects.id })
    .from(clientProjects)
    .where(
      and(
        eq(clientProjects.id, projectId),
        eq(clientProjects.ownerId, ownerId),
      ),
    )
    .limit(1);
  return project;
}

function toProjectFinding(row: typeof clientProjectFindings.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    analysisRunId: row.analysisRunId,
    statement: row.statement,
    type: row.type,
    status: row.status,
    sourceKind: row.sourceKind,
    sourceRefs: row.sourceRefs,
    sourceLabels: row.sourceLabels,
    createdBy: row.createdBy,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/projects/:id/analysis-runs", async (req, res, next) => {
  const params = ListProjectAnalysisRunsParams.safeParse(req.params);
  if (!params.success || params.data.id < 1) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    if (!(await getOwnedProject(params.data.id, ownerId))) {
      res.status(404).json({ error: "Project not found." });
      return;
    }

    const rows = await db
      .select({
        id: clientProjectAnalysisRuns.id,
        projectId: clientProjectAnalysisRuns.projectId,
        mode: clientProjectAnalysisRuns.mode,
        imageNames: clientProjectAnalysisRuns.imageNames,
        summary: clientProjectAnalysisRuns.summary,
        createdAt: clientProjectAnalysisRuns.createdAt,
      })
      .from(clientProjectAnalysisRuns)
      .where(eq(clientProjectAnalysisRuns.projectId, params.data.id))
      .orderBy(desc(clientProjectAnalysisRuns.createdAt));

    res.json(ListProjectAnalysisRunsResponse.parse({ runs: rows }));
  } catch (error) {
    next(error);
  }
});

router.get("/projects/:id/analysis-runs/:runId", async (req, res, next) => {
  const params = GetProjectAnalysisRunParams.safeParse(req.params);
  if (
    !params.success ||
    params.data.id < 1 ||
    params.data.runId < 1
  ) {
    res.status(404).json({ error: "Analysis run not found." });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    if (!(await getOwnedProject(params.data.id, ownerId))) {
      res.status(404).json({ error: "Analysis run not found." });
      return;
    }

    const [run] = await db
      .select()
      .from(clientProjectAnalysisRuns)
      .where(
        and(
          eq(clientProjectAnalysisRuns.id, params.data.runId),
          eq(clientProjectAnalysisRuns.projectId, params.data.id),
        ),
      )
      .limit(1);
    if (!run) {
      res.status(404).json({ error: "Analysis run not found." });
      return;
    }

    const findings = await db
      .select()
      .from(clientProjectFindings)
      .where(eq(clientProjectFindings.analysisRunId, run.id))
      .orderBy(clientProjectFindings.createdAt);

    const result = {
      ...run.result,
      analysisRunId: run.id,
      candidate_findings: findings.map(toProjectFinding),
      memory_used: run.memorySnapshot,
    };

    res.json(
      GetProjectAnalysisRunResponse.parse({
        id: run.id,
        projectId: run.projectId,
        mode: run.mode,
        imageNames: run.imageNames,
        summary: run.summary,
        createdAt: run.createdAt,
        result,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/projects/:id/findings", async (req, res, next) => {
  const params = ListProjectFindingsParams.safeParse(req.params);
  if (!params.success || params.data.id < 1) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    if (!(await getOwnedProject(params.data.id, ownerId))) {
      res.status(404).json({ error: "Project not found." });
      return;
    }

    const rows = await db
      .select()
      .from(clientProjectFindings)
      .where(eq(clientProjectFindings.projectId, params.data.id))
      .orderBy(desc(clientProjectFindings.createdAt));

    res.json(
      ListProjectFindingsResponse.parse({
        findings: rows.map(toProjectFinding),
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/findings", async (req, res, next) => {
  const params = CreateProjectFindingParams.safeParse(req.params);
  const body = CreateProjectFindingBody.safeParse(req.body);
  if (!params.success || params.data.id < 1 || !body.success) {
    res.status(400).json({
      error: "Invalid project finding.",
      ...(body.success ? {} : { details: body.error.message }),
    });
    return;
  }

  const statement = body.data.statement.trim();
  if (!statement) {
    res.status(400).json({ error: "A finding statement is required." });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    if (!(await getOwnedProject(params.data.id, ownerId))) {
      res.status(404).json({ error: "Project not found." });
      return;
    }

    const now = new Date();
    const [finding] = await db
      .insert(clientProjectFindings)
      .values({
        projectId: params.data.id,
        analysisRunId: null,
        statement,
        type: body.data.type,
        status: body.data.status,
        sourceKind: "manual",
        sourceRefs: [],
        sourceLabels: ["Manual entry"],
        createdBy: ownerId,
        reviewedBy: ownerId,
        reviewedAt: now,
        updatedAt: now,
      })
      .returning();

    res
      .status(201)
      .json(UpdateProjectFindingResponse.parse(toProjectFinding(finding)));
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/projects/:id/findings/:findingId",
  async (req, res, next) => {
    const params = UpdateProjectFindingParams.safeParse(req.params);
    const body = UpdateProjectFindingBody.safeParse(req.body);
    if (
      !params.success ||
      params.data.id < 1 ||
      params.data.findingId < 1 ||
      !body.success
    ) {
      res.status(400).json({
        error: "Invalid project finding update.",
        ...(body.success ? {} : { details: body.error.message }),
      });
      return;
    }

    const statement = body.data.statement?.trim();
    if (body.data.statement !== undefined && !statement) {
      res.status(400).json({ error: "A finding statement is required." });
      return;
    }

    try {
      const ownerId = getAuth(req).userId!;
      if (!(await getOwnedProject(params.data.id, ownerId))) {
        res.status(404).json({ error: "Project or finding not found." });
        return;
      }

      const [finding] = await db
        .update(clientProjectFindings)
        .set({
          status: body.data.status,
          ...(statement !== undefined ? { statement } : {}),
          ...(body.data.type !== undefined ? { type: body.data.type } : {}),
          reviewedBy: ownerId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(clientProjectFindings.id, params.data.findingId),
            eq(clientProjectFindings.projectId, params.data.id),
          ),
        )
        .returning();

      if (!finding) {
        res.status(404).json({ error: "Project or finding not found." });
        return;
      }

      res.json(UpdateProjectFindingResponse.parse(toProjectFinding(finding)));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
