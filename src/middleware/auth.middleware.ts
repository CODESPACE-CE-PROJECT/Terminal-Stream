import { NextFunction, Request, Response } from "express";
import { IJwt, RequestWithUser } from "../interface/auth.interface";
import jwt from "jsonwebtoken";
import { environment } from "../config/environment";
// import { IUser } from "../interfaces/user.interface";
// import { userService } from "../services/user.service";

const decodeToken = (token: string): IJwt => {
  return jwt.verify(token, environment.JWT_SECRET as string) as IJwt;
};

export const authorization = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "UNAUTHORIZED" });
  }

  try {
    const decoded = decodeToken(token);
    if (decoded.role !== "STUDENT" && decoded.role !== "TEACHER") {
      return res.status(401).json({ message: "UNAUTHORIZED" });
    }
//     const user: IUser | null = await userService.profile(token);

//     if (!user) {
//       return res.status(401).json({ message: "UNAUTHORIZED" });
//     }

//     (req as RequestWithUser).user = { ...user, token };
    next();
  } catch (error) {
    return res.status(401).json({ message: "UNAUTHORIZED" });
  }
};