import express, { Application, Request, Response } from "express";
import cors from "cors";
import { config } from "dotenv";
import os from "os";
import helmet from "helmet";
import cluster from "cluster";
import swaggerDocs from "./utils/swagger";
import logger from "./utils/logger";

// Router
import { serverRouter } from "./routes/server.route";
import { environment } from "./config/environment";
import { compilerRouter } from "./routes/compiler.route";

config();

const app: Application = express();
const coreTotal: number = Math.min(os.cpus().length, 4);
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());

// API Route
app.use("/", serverRouter);
app.use("/compiler", compilerRouter);

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

if (cluster.isPrimary) {
  for (let i = 0; i < coreTotal; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker, _code, _signal) => {
    logger.info(`Worker ${worker.process.pid} died`);
  });
} else {
  app.listen(environment.PORT, "0.0.0.0", () => {
    logger.info(`Server ready on port ${environment.PORT}`);
    swaggerDocs(app);
  });
}
