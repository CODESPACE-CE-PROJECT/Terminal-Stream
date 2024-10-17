import { environmentSchema } from "../schema/environment.schema";
import { config } from "dotenv";

config();

export const environment = environmentSchema.parse(process.env);
