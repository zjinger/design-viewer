import { FastifyInstance } from "fastify";
import userRouter from "./user.router";
import authRouter from "./auth.router";
import logRouter from "./log.router";
import uploadRouter from "./upload.router";
function routing(server: FastifyInstance) {
  // 认证
  server.register(authRouter, { prefix: "/api/v1/auth" });
  // 用户管理
  server.register(userRouter, { prefix: "/api/v1/users" });
  // 日志管理
  server.register(logRouter, { prefix: "/api/v1/log" });
  // 文件上传管理
  server.register(uploadRouter, { prefix: "/api/v1/content" });
}

export default routing;
