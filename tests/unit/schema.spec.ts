import { test, expect } from "@playwright/test";
import { z } from "astro/zod";
import { projectSchema } from "../../src/lib/project-schema";

const schema = projectSchema(() => z.string());
const valid = {
  title: "Example",
  subtitle: "An analytical project",
  summary: "A reproducible answer to a clearly stated question.",
  question: "What changes under a different method?",
  date: "2026-10-01",
  order: 0,
  role: "Analysis and implementation.",
  stack: ["Python"],
  metrics: [
    {
      value: "Example result",
      label: "Test fixture",
      detail: "A test fixture, not a public claim.",
    },
  ],
  links: {
    demo: "https://example.com/",
    repo: "https://github.com/example/example",
  },
  cover: "example.png",
  coverAlt: "An example plot",
};

test("a valid minimal project passes and draft defaults to false", () => {
  const result = schema.parse(valid);
  expect(result.draft).toBe(false);
  expect(result.featured).toBe(true);
  expect(result.date).toBeInstanceOf(Date);
});

for (const field of Object.keys(valid)) {
  test(`missing required field ${field} fails`, () => {
    const input: Record<string, unknown> = { ...valid };
    delete input[field];
    expect(schema.safeParse(input).success).toBe(false);
  });
}

for (const key of ["demo", "repo", "docs"]) {
  test(`non-https ${key} URL fails`, () => {
    expect(
      schema.safeParse({
        ...valid,
        links: { ...valid.links, [key]: "http://example.com" },
      }).success,
    ).toBe(false);
  });
}

test("summary over 220 characters fails", () => {
  expect(schema.safeParse({ ...valid, summary: "x".repeat(221) }).success).toBe(
    false,
  );
});
test("empty metrics fail", () => {
  expect(schema.safeParse({ ...valid, metrics: [] }).success).toBe(false);
});
