import { Router, Request, Response } from "express";
import { terminalController } from "../controllers/terminal.controller";
import { DockerService } from "../services/docker.service";

const terminalRouter = (dockerService: DockerService) => {
  const router = Router();
  router.get("/createContainer/:name", (req: Request, res: Response) =>
    terminalController.createContainer(req, res, dockerService),
  );

  return router;
};
export { terminalRouter };
