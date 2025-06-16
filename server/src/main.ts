import path from "path";
import fastify from "fastify";
import formbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import fastifyCompress from "@fastify/compress";
import { utils } from "./utils/utils";
import routing from "./routes";
import { initDb } from "./config/db.config";
import { AppError, ERRORS } from "./helpers/errors.helper";
import fastifyBetterSqlite3 from "./plugins/better-sqlite3";
// import redisPlugin from "./plugins/redis";
import wsPlugin from "./plugins/ws";
import loggerPlugin from "./plugins/logger";
// import wsRelayPlugin from "./plugins/wsRelay";
import auth from "./plugins/auth";
import { cryptoUtil } from "./utils/crypto";
import fastifyMultipart from "@fastify/multipart";
import { getLogFilePath, getWwwPath, getAppEnv } from "./utils/getEnvPath";
import { LOG_EVENT_TYPE } from "./constants/log";
const { isDev, port, host, https, encrypt, bodyLimitSize } = getAppEnv();
const loggerOptions = () => {
  // 设置日志目录
  const logFile = getLogFilePath();
  return {
    level: process.env.LOG_LEVEL,
    timestamp: () => `,"time":"${utils.getUTC()}"`,
    transport: {
      target: "pino/file",
      options: {
        destination: path.resolve(logFile),
      },
    },
  };
};
const devServer = () => {
  return {
    logger: {
      level: "debug",
    },
  };
};
const prodServer = () => {
  return {
    logger: loggerOptions(),
    bodyLimit: bodyLimitSize * 1024 * 1024,
  };
};

const startServer = async () => {
  const server = fastify(isDev ? devServer() : prodServer());
  // 注册better-sqlite3插件
  const db = await initDb(server);
  server.register(fastifyBetterSqlite3, {
    class: db.class,
    connection: db.connection,
  });
  // 注册日志插件, 传入数据库连接
  server.register(loggerPlugin, { db: db.connection });
  server.register(auth); // 注册jwt插件
  server.register(formbody); // application/x-www-form-urlencoded
  server.register(fastifyCompress, { global: true }); // 压缩
  server.register(fastifyMultipart); // multipart/form-data
  // await server.register(redisPlugin); // redis
  await server.register(wsPlugin); // ws
  // await server.register(wsRelayPlugin); // wsRelay

  // 配置静态文件服务
  const rootDir = getWwwPath();
  server.register(fastifyStatic, {
    root: rootDir, // 指定前端静态文件目录
    prefix: "/", // 访问路径前缀
    maxAge: 86400000, // 缓存时间 1 天
    cacheControl: true, // 是否启用缓存控制
  });
  // 注册路由
  routing(server);
  // 404
  server.setNotFoundHandler((request, reply) => {
    // reply.status(404).send({ info: "Not Found" });
    // 如果请求路径是 API，不处理
    if (request.url.startsWith("/api")) {
      return reply.status(404).send({ info: "Not Found" });
    }
    // 否则返回 `index.html`，让前端框架接管路由
    return reply.sendFile("index.html");
  });
  // 错误处理
  server.setErrorHandler((error, request, reply) => {
    // 1. 参数校验错误
    if (error.validation) {
      console.log("error.validation,", error.validation);
      // error.validation 是一个数组，里面包含了所有 Ajv 校验失败的详情
      request.log.warn(
        { validation: error.validation },
        "Request validation failed"
      );
      reply.status(400).send({
        rlt: 1,
        info: error.message,
        errors: error.validation,
      });
      return;
    }

    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        rlt: 1,
        info: error.message,
      });
      return;
    }

    // 错误日志记录到日志文件
    request.log.error(error, "统一错误处理");
    console.error(error);
    reply.status(500).send({
      rlt: 1,
      info: isDev ? error.message : ERRORS.internalServerError.message,
    });
  });
  // helth check
  server.get("/api/v1/check/health", async (request, reply) => {
    try {
      // 检查redis 服务是否正常
      // @ts-ignore
      const isRedisAlive = await server.isRedisAlive();
      // TODO:检查其他
      reply.status(200).send({
        rlt: 0,
        info: "success",
        data: {
          redisActive: isRedisAlive,
        },
      });
    } catch (e) {
      reply.status(500).send({ rlt: 0, info: "运行状况检查失败" });
    }
  });

  // 前端获取公钥
  server.get("/api/v1/pkh", async (request, reply) => {
    try {
      const publicKey = cryptoUtil.getPublicKeyHex();
      reply.status(200).send({ rlt: 0, datas: publicKey, info: "ok" });
    } catch (e) {
      reply.status(500).send({ rlt: 1, info: "pkh error" });
    }
  });

  // preValidation 钩子
  server.addHook("preValidation", (request, reply, done) => {
    const isEncrypt = request.headers["x-encrypted"] === "true";
    // 如果没有加密，直接返回
    if (!isEncrypt) {
      done();
      return;
    }
    // 如果前后端加密情况不一致，直接返回错误
    if (encrypt && isEncrypt !== encrypt) {
      reply.code(400).send({ rlt: 1, error: "Encryption mismatch" });
      done(new Error("ENCRYPTION_MISMATCH"));
      return;
    }
    try {
      const encryptedData = (<{ datas: string }>request.body).datas;
      if (!encryptedData) {
        throw new Error("Missing encrypted data");
      }
      const decryptedData = cryptoUtil.decrypt(encryptedData);
      request.body = JSON.parse(decryptedData);
      done();
    } catch (e) {
      server.log.error(
        `Decryption error: ${e.message}, request body: ${JSON.stringify(
          request.body
        )}`
      );
      server.log.error(e);
      // 发送错误响应
      reply.code(400).send({ rlt: 1, error: "Decryption failed" });
      throw new Error("DECRYPTION_FAILED"); // 终止后续流程
    }
  });

  // 进程信号处理：关闭
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      try {
        await server.close();
        server.log.error(`应用已关闭, 信号: ${signal}`);
        process.exit(0);
      } catch (err) {
        server.log.error(`关闭应用失败, 信号: ${signal}`, err);
        process.exit(1);
      }
    });
  });

  // 启动服务
  try {
    await server.listen({ port, host });
    const logstr = `Server listening at ${
      https ? "https" : "http"
    }://${host}:${port}, env: ${isDev ? "DEV" : "PRDO"}`;
    server.log.info(logstr);
    // @ts-ignore
    server.logger.info(null, LOG_EVENT_TYPE.SYSTEM_START, "WEB服务启动完成");
  } catch (e) {
    if (e) {
      server.log.error(e, "启动失败");
    }
    process.exit(1);
  }

  // unhandledRejection 事件处理 退出进程
  process.on("unhandledRejection", (reason, promise) => {
    const message = `Unhandled Rejection at: ${promise}, reason: ${reason}`;
    // 开发环境，可以直接退出进程
    server.log.error(message);
    if (process.env.NODE_ENV === "development") {
      process.exit(1);
    }
    // else if (process.env.NODE_ENV === "production") {
    //   // 在生产环境，可以记录日志，发邮件通知等
    //   server.log.error(message);
    // }
  });
};
// 启动服务
startServer();
