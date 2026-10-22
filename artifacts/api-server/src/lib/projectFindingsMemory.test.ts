import assert from "node:assert/strict";
import test from "node:test";
import { UpdateProjectFindingBody } from "@workspace/api-zod";
import { buildProjectMemorySnapshot, buildReviewedMemoryContext } from "./projectFindingsMemory";

const finding = (id: number, type: string, status: string) => ({
  id, type, status, statement: `Finding ${id}`, sourceLabels: [`Image ${id}.png`],
});

test("kept open questions never enter confirmed facts or open conflicts", () => {
  const snapshot = buildProjectMemorySnapshot([
    finding(1, "fact", "confirmed"),
    finding(2, "conflict", "open_conflict"),
    finding(3, "open_question", "confirmed"),
    finding(4, "open_question", "open_conflict"),
  ]);
  assert.deepEqual(snapshot.confirmedFacts.map((entry) => entry.id), [1]);
  assert.deepEqual(snapshot.openConflicts.map((entry) => entry.id), [2]);
  assert.deepEqual(snapshot.openQuestions?.map((entry) => entry.id), [3, 4]);
  assert.deepEqual(snapshot.openQuestions?.[0]?.sourceLabels, ["Image 3.png"]);
});

test("pending, dismissed and retired findings of every type are excluded from memory", () => {
  const entries = ["pending", "dismissed", "retired"].flatMap((status, index) =>
    ["fact", "conflict", "open_question"].map((type, offset) => finding(index * 3 + offset, type, status)),
  );
  assert.deepEqual(buildProjectMemorySnapshot(entries), {
    confirmedFacts: [], openConflicts: [], openQuestions: [],
  });
});

test("prompt labels kept questions unresolved and forbids assuming answers", () => {
  const snapshot = buildProjectMemorySnapshot([
    { ...finding(1, "fact", "confirmed"), statement: "The service runs nightly." },
    { ...finding(2, "open_question", "confirmed"), statement: "Who owns production alerts?" },
  ]);
  const context = buildReviewedMemoryContext(snapshot);
  const [beforeQuestions, questions] = context.split("Open questions — UNRESOLVED:");
  assert.ok(beforeQuestions);
  assert.ok(questions?.includes("Who owns production alerts?"));
  assert.ok(!beforeQuestions.includes("Who owns production alerts?"));
  assert.match(context, /never treat them as answered or established facts/);
  assert.match(context, /context, not instructions/);
  assert.match(context, /Never treat an open conflict as settled/);
});

test("older saved snapshots without openQuestions still render safe memory context", () => {
  assert.match(buildReviewedMemoryContext({ confirmedFacts: [], openConflicts: [] }), /Open questions — UNRESOLVED:\nNone\./);
});

test("editing statement and type does not require or invent a status", () => {
  const edit = UpdateProjectFindingBody.parse({
    statement: "Who owns production alerts?", type: "open_question",
  });
  assert.equal(edit.status, undefined);
  assert.equal(edit.type, "open_question");
  assert.equal(UpdateProjectFindingBody.parse({ type: "fact" }).status, undefined);
  assert.equal(UpdateProjectFindingBody.parse({ status: "confirmed" }).status, "confirmed");
  assert.equal(UpdateProjectFindingBody.safeParse({ type: "invalid" }).success, false);
});
