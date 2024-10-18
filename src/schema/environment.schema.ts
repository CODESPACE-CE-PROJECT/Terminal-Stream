import { z } from "zod";

export const environmentSchema = z.object({
  PORT: z.string().regex(/^\d+$/).default("3003").transform(Number),
  JWT_SECRET: z.string(),
  BACKEND_URL: z.string()
});
