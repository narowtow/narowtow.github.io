import { getCollection } from "astro:content";

/** Published projects in home-page order. The only place drafts are filtered. */
export async function getProjects() {
  const all = await getCollection("projects", ({ data }) => !data.draft);
  return all.sort((a, b) => a.data.order - b.data.order);
}
