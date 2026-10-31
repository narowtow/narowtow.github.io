// CONTRACT (Phase 0). Shared by src/content.config.ts and the unit tests.
// Change only with the reviewer's approval: pages (pf-site) and content (pf-content) both depend on it.
import { z } from "astro/zod";

const httpsUrl = z.string().url().startsWith("https://");

/** A number shown as evidence. `detail` must name metric, comparator, population and period. */
export const metricSchema = z.object({
  value: z.string().min(1), // display form, e.g. "10.7%", "185", "43rd → 180th"
  label: z.string().min(1), // short label under the value
  detail: z.string().min(1), // the qualification a careful reader needs
});

/**
 * Factory so tests can pass a stand-in for Astro's `image()` helper.
 * In content.config.ts: `schema: ({ image }) => projectSchema(image)`.
 */
export function projectSchema<T extends z.ZodTypeAny>(image: () => T) {
  return z.object({
    title: z.string().min(1), // "Visceral"
    subtitle: z.string().min(1), // "Global Health Anatomy Explorer"
    summary: z.string().min(1).max(220), // one sentence: question -> what I did -> finding
    question: z.string().min(1), // the driving question, phrased as a question
    date: z.coerce.date(), // month the project shipped
    order: z.number().int().min(0), // ascending order on the home page
    featured: z.boolean().default(true),
    draft: z.boolean().default(false),
    role: z.string().min(1), // what Justin did, incl. how AI coding agents were used
    stack: z.array(z.string().min(1)).min(1),
    metrics: z.array(metricSchema).min(1).max(4), // first one is the headline result
    links: z.object({
      demo: httpsUrl,
      demoNote: z.string().optional(), // e.g. "Streamlit app; may take a moment to wake"
      repo: httpsUrl,
      docs: httpsUrl.optional(), // methods / analysis write-up
    }),
    cover: image(),
    coverAlt: z.string().min(1),
    accent: z.enum(["teal", "clay"]).default("teal"),
  });
}

export type ProjectData = z.infer<ReturnType<typeof projectSchema<z.ZodString>>>;
