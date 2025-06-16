import { FastifyInstance as BaseInstance } from "fastify";
import { RedisClientType } from "redis";
import { WebSocket } from "@fastify/websocket";
import { LoggerService } from "@/services/log.service";
import { PubRequestBody, RpcOptions, SubUpdatePayload } from "@/schemas";
import { RedisChannelType } from "@/constants/channel";

export interface AppFastifyInstance extends BaseInstance {
  betterSqlite3: any; // 或 Database 类型
  logger: LoggerService;
  redis: RedisClientType;
  redisSub: RedisClientType;
  redisChannel: Record<RedisChannelType, string>;
  // 状态更新数据
  updateCached: SubUpdatePayload | undefined;
  // 发布工具
  publish: <T>(channel: string, data: PubRequestBody<T>) => Promise<void>;
  isRedisAlive: () => Promise<boolean>;
  /** RPC 请求封装：await redisRpc('getSysInfo', {}) */
  redisRpc: <T, S>(
    requestParams: PubRequestBody<T>,
    opt?: RpcOptions
  ) => Promise<S>;

  wsClients: Set<WebSocket>;

  verifyJWT: (req: any, reply: any) => Promise<void>;
  isUser: (req: any, reply: any) => Promise<void>;
  isAdmin: (req: any, reply: any) => Promise<void>;

  authPreHandlers: {
    authentication: { preHandler: AppFastifyInstance["verifyJWT"] };
    requireUser: {
      preHandler: [
        AppFastifyInstance["verifyJWT"],
        AppFastifyInstance["isUser"]
      ];
    };
    requireAdmin: {
      preHandler: [
        AppFastifyInstance["verifyJWT"],
        AppFastifyInstance["isUser"],
        AppFastifyInstance["isAdmin"]
      ];
    };
  };
}
