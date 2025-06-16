// src/typings.d.ts
import { Database } from "better-sqlite3";
import { LoggerService } from "./services/log.service";
import { RedisClientType } from "redis";
import { PubRequestBody, RpcOptions, SubUpdatePayload } from "./schemas";

import { WebSocket } from "@fastify/websocket";
import { RedisChannelType } from "./constants/channel";

declare module "fastify" {
  interface FastifyInstance {
    betterSqlite3: Database;
    logger: LoggerService;
    redis: RedisClientType;
    redisSub: RedisClientType;
    redisChannel: Record<RedisChannelType, string>;
    publish: <T>(channel: string, data: PubRequestBody<T>) => Promise<void>;
    // 状态更新数据
    updateCached: SubUpdatePayload | undefined;
    isRedisAlive: () => Promise<boolean>;
    /** RPC 请求封装：await redisRpc('getSysInfo', {}) */
    redisRpc: <T, S>(
      requestParams: PubRequestBody<T>,
      opt?: RpcOptions
    ) => Promise<S>;
    wsClients: Set<WebSocket>;
    // Auth functions: 注册的 preHandler
    verifyJWT: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    isUser: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    isAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authPreHandlers: {
      authentication: { preHandler: FastifyInstance["verifyJWT"] };
      requireUser: {
        preHandler: [FastifyInstance["verifyJWT"], FastifyInstance["isUser"]];
      };
      requireAdmin: {
        preHandler: [
          FastifyInstance["verifyJWT"],
          FastifyInstance["isUser"],
          FastifyInstance["isAdmin"]
        ];
      };
    };
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: string;
      username: string;
      role: string;
      pwdChangedAt: number;
    }; // 生成 token 用
    user: {
      id: string;
      username: string;
      role: string;
      pwdChangedAt: number;
    }; // request.user 类型
  }
}
