import { createClient } from "redis";
import { environment } from "../config/environment";
import log from "../utils/logger";

export const redisClient = createClient({
  url: `redis://${environment.REDISHOST}:6379`,
});
redisClient.on("error", (err) => log.error("Redis Client Error", err));

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    await redisClient.set("health", "ok");
    const reply = await redisClient.get("health");
    return reply === "ok";
  } catch (error) {
    log.error("Redis Health Check Failed:", error);
    return false;
  }
};

export const subscribeTopic = async (
  topic: string,
  onMessage: (message: any) => void,
) => {
  try {
    if (await checkRedisHealth()) {
      const subscriber = redisClient.duplicate();
      await subscriber.connect();
      await subscriber.subscribe(topic, onMessage);
    }
  } catch (error) {
    throw new Error("Error Subscribe Topic Redis");
  }
};

export const redisDisconnect = async () => {
  await redisClient.disconnect();
};
