import z from "zod";

export const PreInterviewBody = z.object({
  github: z.string(),
  resume: z.string()
});