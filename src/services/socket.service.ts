import { Server, Socket } from "socket.io";
import { socketMiddleware } from "../middleware/socket.middleware";
import { DockerService } from "./docker.service";
import { IrunCode } from "../interface/terminal.interface";
import { IUser } from "../interface/user.interface";
import { redisClient } from "./redis.service";

declare module "socket.io" {
  interface Socket {
    user?: IUser;
  }
}

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

      const existingContainerId = await redisClient.get(
        `container-${username}`,
      );

      if (existingContainerId) {
        await docker.removeContainer(existingContainerId);
        redisClient.del(`container-${username}`);
      }

      const containerId = await docker.createContainer(username);

      redisClient.set(`container-${username}`, containerId);

      socket.emit("init", "terminal ready");

      socket.on("runCode", async (msg: IrunCode) => {
        const containerId = await redisClient.get(`container-${username}`);

        if (!containerId) {
          socket.emit("error", "No Container found for this user");
          return;
        }

        socket.emit("clear", "clear Terminal");

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
          redisClient.del(`container-${username}`);
        } catch (error) {
          throw new Error("Error Cleaning up Container");
        }
      });
    } catch (error) {
      socket.emit("error", "Error creating Docker container.");
    }
    socket.on("error", (_err) => {
      throw new Error("Error Socket io");
    });
  });
};
