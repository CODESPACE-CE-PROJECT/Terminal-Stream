import { Router } from "express";
import { initServer } from "../controllers/server.controller";

const router = Router();

router.get("/", initServer);

export { router as serverRouter };
