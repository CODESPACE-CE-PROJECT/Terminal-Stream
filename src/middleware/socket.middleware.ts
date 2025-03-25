import { Socket } from "socket.io";
import { IUser } from "../interface/user.interface";
import { userService } from "../services/user.service";
import jwt from "jsonwebtoken";
import { environment } from "../config/environment";
import { IJwt } from "../interface/auth.interface";

const decodeToken = (token: string): IJwt | null => {
  try {
    return jwt.verify(token, environment.JWT_SECRET) as IJwt;
  } catch (error) {
    return null;
  }
};

export const socketMiddleware = async (socket: Socket, next: Function) => {
  const token: string | undefined = socket.handshake.headers.authorization;
  try {
    if (!token) {
      console.error("Authorization header is missing");
      return next(new Error("Authorization token is required"));
    }

    const decoded = decodeToken(token);

    if (!decoded || !decoded.role) {
      console.error("Invalid or malformed token");
      return next(new Error("Unauthorized"));
    }

    const user: IUser | null = await userService.profile(token);

    if (!user?.data) {
      console.error("User not found or unauthorized");
      return next(new Error("Unauthorized"));
    }

    next();
  } catch (error) {
    console.error("Error in socket middleware:", error);
    next(new Error("Unauthorized"));
  }
};
