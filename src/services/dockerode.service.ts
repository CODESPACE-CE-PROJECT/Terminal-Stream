import Dockerode from "dockerode";
import fs from 'fs'

export class DockerService {
     private docker: Dockerode;
     constructor() {
          const socket = '/var/run/docker.sock';
          if (!fs.statSync(socket)) {
               throw new Error('Are you sure the docker is running?')
          }
          this.docker = new Dockerode({ socketPath: socket, timeout: 200 })
     }

     public createContainer = async(): Promise<string> => {
          const container = await this.docker.createContainer({
               Image: 'terminal:latest', 
               Cmd: ['/bin/ash'],
               name: `$`,
               AttachStdin: true,
               AttachStdout: true,
               AttachStderr: true,
               Tty: true,
               OpenStdin: true,
          })
          await container.start()
          return container.id.toString()
     }
}