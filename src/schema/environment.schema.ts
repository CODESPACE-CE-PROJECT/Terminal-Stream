import { z } from "zod";

export const environmentSchema = z.object({
  PORT: z.string().regex(/^\d+$/).default("3003").transform(Number),
});
