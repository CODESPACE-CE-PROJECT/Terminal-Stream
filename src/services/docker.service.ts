import Dockerode from "dockerode";
import { LanguageType } from "../interface/terminal.interface";
import tar from "tar-stream";
import stream from 'stream'
import { environment } from "../config/environment";

export class DockerService {
  private docker: Dockerode;
  constructor() {
    this.docker = new Dockerode(environment.NODE_ENV === 'production' ? { socketPath: '/var/run/docker.sock' } : {
      host: "127.0.0.1",
      port: 2375,
    });
  }

  public getAllContainer = async () => {
    return await this.docker.listContainers();
  };

  public createContainer = async (name: string): Promise<string> => {
    try {
      const container = await this.docker.createContainer({
        Image: "ghcr.io/codespace-ce-project/codespace-terminal:latest",
        Cmd: ["/bin/ash"],
        name: `cs-${name}`,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        OpenStdin: true,
      });
      await container.start();
      return container.id.toString();
    } catch (error: any) {
      if (error.message.includes("No such image")) {
        console.log("Image not found. Pulling the image...");
        try {
          const auth = {
            username: environment.DOCKER_USERNAME,
            password: environment.DOCKER_PASSWORD,
            email: environment.DOCKER_EMAIL,
            serveraddress: environment.DOCKER_SERVERADDRESS
          };
          await this.docker.pull("ghcr.io/codespace-ce-project/codespace-terminal:latest", { 'authconfig': auth });
          console.log("Image pulled successfully. Retrying container creation...");
          return await this.createContainer(name); // Retry after pulling the image
        } catch (pullError) {
          console.log("Failed to pull the image:", pullError);
          return "error";
        }
      } else {
        return "error";
      }
    }
  };

  public removeContainer = async (containerId: string) => {
    const container = this.docker.getContainer(containerId);
    await container.remove({ force: true });
    return `remove ${container.id} container success`;
  };

  public createFileInContainer = async (
    containerId: string,
    sourceCode: string,
    language: LanguageType,
    fileName: string,
  ) => {
    try {
      const container = this.docker.getContainer(containerId);
      const sourceCodeToBuffer = Buffer.from(sourceCode, "utf-8");
      const pack = tar.pack();
      const lastFileName = { C: "c", CPP: "cpp", PYTHON: "py", JAVA: "java" };
      pack.entry(
        {
          name: `/src/${language}/${fileName ? fileName : process.pid}.${lastFileName[language]}`,
        },
        sourceCodeToBuffer,
      );
      pack.finalize();
      await container.putArchive(pack, { path: "/" });
      return {
        filePath: `/src/${language}/${fileName ? fileName : process.pid}.${lastFileName[language]}`,
      };
    } catch (error) {
      console.log(error);
      return {
        filePath: "",
      };
    }
  };

  public runCode = async (
    containerId: string,
    filePath: string,
    language: LanguageType,
  ) => {
    try {
      const fileName = filePath.match(/([^/]+)(?=\.\w+$)/)![0];
      const cmd = {
        C: {
          command: `mkdir -p /src/C/exe-c && gcc ${filePath} -o /src/C/exe-c/${fileName} && /src/C/exe-c/${fileName}`,
        },
        CPP: {
          command: `mkdir -p /src/CPP/exe-cpp && g++ -w -std=c++14 ${filePath} -o /src/CPP/exe-cpp/${fileName} && /src/CPP/exe-cpp/${fileName}`,
        },
        PYTHON: {
          command: `python3 ${filePath}`,
        },
        JAVA: {
          command: `mkdir -p /src/JAVA/exe-java && javac -d /src/JAVA/exe-java ${filePath} && java -cp /src/JAVA/exe-java ${fileName}`,
        },
      };
      const container = this.docker.getContainer(containerId);
      const exec = await container.exec({
        Cmd: ["/bin/ash", "-c", cmd[language].command],
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: true,
        Tty: true,
      });
      const stdout = new stream.PassThrough()

      const ttyStream = await exec.start({ hijack: true, stdin: true });
      this.docker.modem.demuxStream(ttyStream, stdout, stdout)

      return { ttyStream, stdout };
    } catch (error) {
      console.log(error);
    }
  };
}
