import { Server, Socket } from "socket.io";
import { socketMiddleware } from "../middleware/socket.middleware";
import { DockerService } from "./docker.service";
import { IrunCode } from "../interface/terminal.interface";

const userSocket = new Map<string, string>();
export const ioHandler = async (io: Server, docker: DockerService) => {
  io.use(socketMiddleware);
  io.on('connection', async (socket: Socket) => {
    try {
      const containerId = await docker.createContainer(socket.id)

      userSocket.set(socket.id, containerId)
      socket.emit('init', 'container ready')

      socket.on('runCode', async (msg: IrunCode) => {
        const containerId = userSocket.get(socket.id)
        if (!containerId) {
          socket.emit('error', 'No Container found for this user')
          return;
        }
        try {
          const fileContainer = await docker.createFileInContainer(
            containerId,
            msg.sourceCode,
            msg.language,
            msg.fileName
          )
          const stream = await docker.runCode(containerId, fileContainer.filePath, msg.language)
          if (!stream) {
            socket.emit('error', 'Failed to run code.')
            return;
          }

          stream.stdout.on('data', (data) => {
            socket.emit('message', data.toString('utf-8'))
          })

          socket.on('data', (inputMsg) => {
            if (stream.ttyStream) {
              stream.ttyStream.write(inputMsg)
            }
          })
        } catch (error) {
          socket.emit('error', 'Error during code execution')
        }
      });

      socket.on('disconnect', async () => {
        try {
          await docker.removeContainer(containerId)
          userSocket.delete(socket.id)
        } catch (error) {
          throw new Error('Error Clen up Container')
        }
      });
    } catch (error) {
      socket.emit('error', 'Error creating Docker container.');
    }
    socket.on("error", (_err) => {
      socket.disconnect();
      throw new Error('Error Socket io')
    });
  })
};
