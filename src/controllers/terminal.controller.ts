import { Request, Response } from "express";
import { DockerService } from "../services/docker.service";

export const terminalController = {
  createContainer: async (
    req: Request,
    res: Response,
    dockerService: DockerService,
  ) => {
    const container = await dockerService.createContainer(req.params.name);
    res.status(200).json({
      message: "Create Container Success",
      data: container,
    });
  },
};
