import { Socket } from "socket.io";

export const socketMiddleware = (socket: Socket, next: Function) => {
  const token: string | undefined = socket.handshake.auth.token;
  if (!token) {
    next(new Error());
  }
  next();
};
