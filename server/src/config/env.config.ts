import path from "path";
import dotenv from "dotenv";

// 解析命令行参数
const args = process.argv.slice(2);
const envArg = args.find((arg) => arg.startsWith("--env="));
const env = envArg ? envArg.split("=")[1] : "production"; // 默认为 production
export default function loadConfig(): void {
  const curDir = process.cwd();
  const envPath = path.join(
    curDir,
    env === "development" ? ".env.dev" : ".env.prod"
  );
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    throw new Error(
      `Failed to load .env file from path ${envPath}: ${result.error.message}`
    );
  }
  //  else {
  //   const parsed = result.parsed;
  //   if (parsed) {
  //     const basePath = process.env.APP_SD_PATH;
  //     if (!basePath || basePath.trim().length == 0) {
  //       throw new Error(`请配置 APP_SD_PATH 目录`);
  //     }
  //   }
  // }
}
