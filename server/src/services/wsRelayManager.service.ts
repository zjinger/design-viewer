import { AppFastifyInstance } from "@/types/fastify-instance";
import { WsResponseBody } from "@/schemas";
import { RedisClientType } from "redis";
import { utils } from "@/utils/utils";
import { WS_CHANNEL } from "@/constants/ws";

type RelayHandler<T> = (raw: string) => T;

export async function registerRelay<T>(
  app: AppFastifyInstance,
  redisChannel: string,
  wsChannel: WS_CHANNEL,
  handler: RelayHandler<T>,
  ifDefaultSend = true
): Promise<RedisClientType | null> {
  try {
    const sub = app.redis.duplicate();
    await sub.connect();

    await sub.subscribe(redisChannel, (raw) => {
      try {
        const payload = handler(raw);
        const res: WsResponseBody<T> = {
          channel: wsChannel,
          timestamp: utils.getUTC(),
          payload,
        };
        const msg = JSON.stringify(res);
        for (const ws of app.wsClients) {
          if (ws.readyState) {
            if (ifDefaultSend) {
              ws.send(msg);
            } else {
              const subChannels = ws["subChannels"] as Set<string>;
              if (
                subChannels &&
                subChannels.size > 0 &&
                subChannels.has(wsChannel)
              ) {
                ws.send(msg);
              }
            }
          }
        }
      } catch (err) {
        const errorMsg = `[WS Relay] 解析错误: ${redisChannel}`;
        app.log.error(errorMsg, err?.message);
      }
    });

    app.log.info(
      `[WS Relay] 订阅 Redis(${redisChannel}) → WS(${wsChannel}) 成功`
    );
    return sub;
  } catch (e) {
    const errorMsg = `[WS Relay] 订阅失败: ${redisChannel}`;
    app.log.error(errorMsg, e?.message);
    return null;
  }
}
