import { Request } from "express";
import { IUser } from "./user.interface";

export interface RequestWithUser extends Request {
  user: IUser | any;
}

export interface IJwt {
  username: string;
  role: string;
  schoolId: string;
  iat: number;
  exp: number;
}