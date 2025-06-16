// plugins/better-sqlite3.ts
import fp from "fastify-plugin";
import Database, { Database as DatabaseType } from "better-sqlite3";
import { FastifyPluginAsync, FastifyInstance } from "fastify";

interface BetterSqlite3Options {
  /** 自定义数据库类（用于测试或扩展） */
  class?: typeof Database;
  /** 已存在的数据库连接 */
  connection?: DatabaseType;
  /** 数据库文件路径 */
  pathToDb?: string;
  /** better-sqlite3 的初始化选项 */
  betterSqlite3Opts?: any;
}

const createDbConnection = (
  dbClass: typeof Database,
  options: BetterSqlite3Options
): DatabaseType => {
  const file = options.pathToDb || ":memory:";
  return new dbClass(file, options.betterSqlite3Opts || {});
};

const fastifyBetterSqlite3: FastifyPluginAsync<BetterSqlite3Options> = async (
  fastify: FastifyInstance,
  options: BetterSqlite3Options
) => {
  // 已存在装饰器时抛出错误
   // @ts-ignore
  if (fastify.betterSqlite3) {
    throw new Error("fastify-better-sqlite3 plugin already registered");
  }

  let db: DatabaseType;

  // 使用自定义类或默认类
  const dbClass = options.class || Database;

  // 如果提供了现成连接
  if (options.connection) {
    if (!(options.connection instanceof dbClass)) {
      throw new Error("提供的连接不是有效的数据库实例");
    }
    db = options.connection;
  }
  // 需要新建连接
  else {
    try {
      db = createDbConnection(dbClass, options);
      fastify.log.info(
        `Database connection created (${options.pathToDb || "in-memory"})`
      );
    } catch (err) {
      fastify.log.error("数据库连接失败", err);
      throw new Error("数据库初始化失败");
    }
  }

  // 装饰 Fastify 实例
  fastify.decorate("betterSqlite3", db);

  // 添加关闭钩子
  fastify.addHook("onClose", async (instance) => {
    instance.log.error("Closing database connection");
    db.close();
  });
};

// 使用 fastify-plugin 包装
export default fp(fastifyBetterSqlite3, {
  name: "fastify-better-sqlite3",
  fastify: "5.x", // 根据你的 fastify 版本调整
});
