import { PROJECT_STAGES, type ProjectInput } from "./types";
export const PROJECT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseProjectInput(raw: unknown): ProjectInput {
  if (!raw || typeof raw !== "object") throw new Error("Check your project details.");
  const value = raw as Record<string, unknown>;
  const text = (key: string, max: number, min = 0) => {
    if (typeof value[key] !== "string") throw new Error(`Check the project ${key}.`);
    const result = value[key].trim();
    if (result.length < min || result.length > max) throw new Error(`Project ${key} must be ${min ? `${min}–` : "at most "}${max} characters.`);
    return result;
  };
  const name = text("name", 80, 2), tagline = text("tagline", 180), description = text("description", 10000);
  if (!Array.isArray(value.technologies) || value.technologies.length > 20 || !value.technologies.every((item) => typeof item === "string" && item.trim().length >= 1 && item.trim().length <= 40)) throw new Error("Choose up to 20 technologies, each 1–40 characters.");
  if (value.visibility !== "public" && value.visibility !== "private") throw new Error("Choose a project visibility.");
  if (!PROJECT_STAGES.some((stage) => stage === value.stage)) throw new Error("Choose a project stage.");
  return { name, tagline, description, technologies: [...new Set(value.technologies.map((item: string) => item.trim().toLowerCase()))], visibility: value.visibility, stage: value.stage as ProjectInput["stage"] };
}
export function creationSlug(name: string, requestId: string) {
  if (!PROJECT_UUID.test(requestId)) throw new Error("This save request is invalid. Reload the page.");
  const prefix = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40).replace(/^-|-$/g, "") || "project";
  return `${prefix}-${requestId.replaceAll("-", "").toLowerCase()}`;
}
export function validVersion(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
