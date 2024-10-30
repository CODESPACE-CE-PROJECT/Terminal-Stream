import { Server, Socket } from "socket.io";
import { socketMiddleware } from "../middleware/socket.middleware";
import { DockerService } from "./docker.service";
import { IrunCode } from "../interface/terminal.interface";

export const ioHandler = async (io: Server, docker: DockerService) => {
  //io.use(socketMiddleware);
  io.of(/^\/\w+/)
    //.use(socketMiddleware)
    .on("connection", (socket: Socket) => {
      console.log(`${socket.nsp.name.match(/\w+/)} is connected`);
      socket.on("error", () => {
        console.log("disconnected");
        socket.disconnect();
      });
      socket.on("runCode", async (msg: IrunCode) => {
        const containerId = socket.nsp.name.match(/\w+/)![0];
        const container = await docker.createFileInContainer(
          containerId,
          msg.sourceCode,
          msg.language,
          msg.fileName,
        );

        const ttyStream = await docker.runCode(
          containerId,
          container.filePath,
          msg.language,
        );
        if (!ttyStream) {
          return;
        }
        ttyStream.on("data", (data) => {
          socket.emit("data", data.toString("utf8"));
        });
        socket.on("message", (msg) => {
          ttyStream.write(msg);
        });
        socket.on("disconnect", () => {
          ttyStream.end();
          docker.removeContainer(containerId);
          console.log(`${socket.nsp.name.match(/\w+/)} is disconnected`);
        });
      });
    });
};
