import { Server, Socket } from "socket.io";
import { socketMiddleware } from "../middleware/socket.middleware";
import { DockerService } from "./docker.service";
import { IrunCode } from "../interface/terminal.interface";
import { IUser } from "../interface/user.interface";

declare module "socket.io" {
  interface Socket {
    user?: IUser;
  }
}

const userSocket = new Map<string, string>();
export const ioHandler = async (io: Server, docker: DockerService) => {
  io.use(socketMiddleware);
  io.on("connection", async (socket: Socket) => {
    try {
      if (!socket.user || !socket.user.data.username) {
        socket.emit("error", "User authentication failed");
        socket.disconnect();
        return;
      }

      const username = socket.user.data.username;

      if (userSocket.has(username)) {
        const existingContainerId = userSocket.get(username);
        if (existingContainerId) {
          await docker.removeContainer(existingContainerId);
        }
      }

      const containerId = await docker.createContainer(username);
      userSocket.set(username, containerId);

      socket.emit("init", "terminal ready");

      socket.on("runCode", async (msg: IrunCode) => {
        const containerId = userSocket.get(username);
        if (!containerId) {
          socket.emit("error", "No Container found for this user");
          return;
        }

        if (!(await docker.checkRunningStatus(containerId))) {
          await docker.startContainer(containerId);
        }

        try {
          const fileContainer = await docker.createFileInContainer(
            containerId,
            msg.sourceCode,
            msg.language,
            msg.fileName,
          );
          const stream = await docker.runCode(
            containerId,
            fileContainer.filePath,
            msg.language,
          );
          if (!stream) {
            socket.emit("error", "Failed to run code.");
            return;
          }

          stream.stdout.on("data", (data) => {
            socket.emit("message", data.toString("utf-8"));
          });

          socket.on("data", (inputMsg) => {
            if (stream.ttyStream) {
              stream.ttyStream.write(inputMsg);
            }
          });
        } catch (error) {
          socket.emit("error", "Error during code execution");
        }
      });

      socket.on("disconnect", async () => {
        try {
          await docker.removeContainer(containerId);
          userSocket.delete(username);
        } catch (error) {
          throw new Error("Error Cleaning up Container");
        }
      });
    } catch (error) {
      socket.emit("error", "Error creating Docker container.");
    }
    socket.on("error", (_err) => {
      socket.disconnect();
      throw new Error("Error Socket io");
    });
  });
};
