import axios from "axios";
import { environment } from "../config/environment";

export const api = axios.create({
  baseURL: environment.BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
});