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

declare module "socket.io" {
  interface Socket {
    user?: IUser;
  }
}

export const socketMiddleware = async (socket: Socket, next: Function) => {
  const cookie: string | undefined = socket.handshake.headers.cookie;

  if (!cookie) {
    console.error("Authorization header is missing");
    return next(new Error("Authorization token is required"));
  }

  const tokenMatch = cookie.match(/accessToken=([^;]+)/);
  if (!tokenMatch) {
    console.error("accessToken is missing in cookies");
    return next(new Error("Authorization token is required"));
  }

  const token = tokenMatch[1];
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

    socket.user = user;

    next();
  } catch (error) {
    console.error("Error in socket middleware:", error);
    next(new Error("Unauthorized"));
  }
};
