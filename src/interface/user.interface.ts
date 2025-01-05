export interface IUser {
  message: string
  data: {
    username: string;
    email: string;
    hashedPassword: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    gender: string;
    role: string;
    picture: string;
    containerID: string;
    IpAddress: string;
    isActived: boolean;
    createdAt: Date;
    updatedAt: Date;
    schoolId: string;
    school: {
      schoolId: string;
      schoolName: string;
    };
  }
}
