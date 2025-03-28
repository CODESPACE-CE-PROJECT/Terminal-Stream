import express, { Application, Request, Response } from "express";
import cors from "cors";
import { config } from "dotenv";
import os from "os";
import helmet from "helmet";
import cluster from "cluster";
import logger from "./utils/logger";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { setupPrimary, createAdapter } from "@socket.io/cluster-adapter";
import { setupMaster, setupWorker } from "@socket.io/sticky";
import { checkRedisHealth, redisClient } from "./services/redis.service";
// Router
import { serverRouter } from "./routes/server.route";
import { environment } from "./config/environment";
import { DockerService } from "./services/docker.service";
import { ioHandler } from "./services/socket.service";

config();

const app: Application = express();
const coreTotal: number = Math.min(os.cpus().length, 4);
const dockerService: DockerService = new DockerService();

app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());
const errorHandler = async (
  err: any,
  _req: Request,
  res: Response,
  next: any,
) => {
  console.log(err);

  const statusCode = res.statusCode ? res.statusCode : 500;
  res.status(statusCode).json({
    message: "Eroor!!",
  });
  next();
};

app.use(errorHandler);

// API Route
app.use("/", serverRouter);

if (cluster.isPrimary) {
  const httpServer = createServer(app);

  setupMaster(httpServer, {
    loadBalancingMethod: "least-connection",
  });

  setupPrimary();

  cluster.setupPrimary({
    serialization: "advanced",
  });

  for (let i = 0; i < coreTotal; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, _code, _signal) => {
    logger.info(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["authorization"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  io.adapter(createAdapter());
  setupWorker(io);
  ioHandler(io, dockerService);

  httpServer.listen(environment.PORT, "0.0.0.0", async () => {
    logger.info(`Server ready on port ${environment.PORT}`);
    redisClient.connect();
    if (await checkRedisHealth()) {
      logger.info("Redis Connected");
    }
  });
}
