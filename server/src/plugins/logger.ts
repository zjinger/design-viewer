import fp from "fastify-plugin";
import { Database } from "better-sqlite3";
import { LoggerService } from "@/services/log.service";
import { AppFastifyInstance } from "@/types/fastify-instance";

/**
 * Logger Plugin
 * 注册 `loggerService` 为全局插件
 */
export default fp(
  async (fastify: AppFastifyInstance, options: { db: Database }) => {
    const { db } = options;
    const loggerService = new LoggerService(db, fastify);
    // 挂载 loggerService 到 Fastify 实例
    fastify.decorate("logger", loggerService);
  }
);
