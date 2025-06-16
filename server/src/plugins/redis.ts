/**
 * 	基础 Redis 客户端注入器
 *  用于 publish
 */

import fp from "fastify-plugin";
import { createClient } from "redis";
import { PubRequestBody, RpcOptions, SubResponseBody } from "@/schemas";
import { AppFastifyInstance } from "@/types/fastify-instance";
import { utils } from "@/utils/utils";
import { AppError } from "@/helpers/errors.helper";
import { getRedisEnv } from "@/utils/getEnvPath";
let counter = 0;
function getNextId() {
  const ts = Math.floor(Date.now() / 1000); // UTC 秒数
  return Number(`${ts}${++counter % 1000}`); // 组合ID，尾部加计数器
}

export default fp(async function (server: AppFastifyInstance) {
  const redisEnvOpt = getRedisEnv();
  const redisClient = createClient({
    url: redisEnvOpt.redisUrl,
  });
  redisClient.on("error", (err) => {
    server.log.error("[Redis] 连接错误:", err);
  });

  await redisClient.connect();

  server.log.info("[Redis] 已连接");

  // 注册redis 频道
  server.decorate("redisChannel", {
    ais: redisEnvOpt.aisChannel,
    log: redisEnvOpt.logChannel,
    update: redisEnvOpt.updateChannel,
  });

  // redis 状态
  // @ts-ignore
  server.decorate("isRedisAlive", async () => {
    try {
      return (await redisClient.ping()) === "PONG";
    } catch {
      return false;
    }
  });
  // @ts-ignore
  server.decorate("redis", redisClient);

  /** ---------------- Redis publish ---------------- */
  // 交互数据为base64编码后的json 数据
  server.decorate(
    "publish",
    async <T>(channel: string, reqParam: PubRequestBody<T>) => {
      try {
        server.log.debug(`pub频道 [${channel}]:${JSON.stringify(reqParam)}`);
        // 主控服务交互需要base64编码
        const payload = utils.objToBase64<PubRequestBody<T>>(reqParam);
        server.log.debug(`pub频道 [${channel}]:${payload}`);
        await redisClient.publish(channel, payload);
      } catch (err) {
        const errorMsg = `[Redis] ${RPC_REQ}发布失败,method:${
          reqParam.method
        },id:${reqParam.id},param:${JSON.stringify(reqParam.param)}`;
        server.log.error(errorMsg);
      }
    }
  );

  /** ---------------- RPC over Pub/Sub ---------------- */
  const RPC_REQ = redisEnvOpt.appRpcReq; // web 服务发送数据到主控服务，主控服务是订阅方
  const RPC_RES = redisEnvOpt.appRpcRes; // 主控服务响应web 服务的请求，发布数据到web 服务，主控服务是发布方

  // 应答分发：id => Promise resolver
  const waiters = new Map<
    string | number,
    {
      ok: (v: any) => void;
      fail: (e: any) => void;
    }
  >();
  server.decorate(
    "redisRpc",
    async <T>(
      reqParam: PubRequestBody<T>,
      { timeout = 10000, channel = RPC_REQ }: RpcOptions = {}
    ) => {
      const id = getNextId(); // utils.genUUID();
      reqParam.id = id;
      let timeoutHandle: NodeJS.Timeout;
      const p = new Promise((resolve, reject) => {
        waiters.set(id, { ok: resolve, fail: reject });
        timeoutHandle = setTimeout(() => {
          waiters.delete(id);
          reject(new AppError(`RPC <${reqParam.method}> timeout ${timeout}ms`));
        }, timeout);
      });
      // // -- 发布请求
      await server.publish(channel, reqParam);
      // // TODO:remove
      // if (redisEnvOpt.isDev) {
      //  await server.publish("nodejs.fwserver.mock", reqParam);
      // }
      return p.finally(() => clearTimeout(timeoutHandle));
    }
  );

  const sub = redisClient.duplicate();
  await sub.connect();
  // 订阅一次，所有请求复用
  await sub.subscribe(RPC_RES, <S>(raw) => {
    try {
      server.log.debug(`sub 频道[${RPC_RES}]：${raw}`);
      // 与主控服务的交互数据为base64编码后的json 数据，需要先解码
      const data = <SubResponseBody<S>>utils.base64ToObj(raw);
      server.log.debug(`sub 频道[${RPC_RES}]：${JSON.stringify(data)}`);
      const w = waiters.get(data.id);
      if (!w) return; // 不是给我的
      waiters.delete(data.id);
      // 若存在错误(即error不为空)
      data.error ? w.fail(new AppError(data.error)) : w.ok(data.result);
    } catch (e) {
      server.log.error("[Redis-RPC] 解析响应失败:", e);
    }
  });

  // 应用退出时关闭连接
  server.addHook("onClose", async () => {
    try {
      await sub.quit();
      await redisClient.quit();
    } catch {}
  });
});
