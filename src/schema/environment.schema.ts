import { z } from "zod";

export const environmentSchema = z.object({
  PORT: z.string().regex(/^\d+$/).default("3003").transform(Number),
  JWT_SECRET: z.string(),
  BACKEND_URL: z.string(),
  NODE_ENV: z.string(),
  DOCKER_USERNAME: z.string(),
  DOCKER_PASSWORD: z.string(),
  DOCKER_EMAIL: z.string(),
  DOCKER_SERVERADDRESS: z.string(),
  REDISHOST: z.string(),
});
