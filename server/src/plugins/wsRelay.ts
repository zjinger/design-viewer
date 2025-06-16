import fp from "fastify-plugin";
import { AppFastifyInstance } from "@/types/fastify-instance";
import { registerRelay } from "@/services/wsRelayManager.service";
import { LOG_EVENT_TYPE } from "@/constants/log";
import { WS_CHANNEL } from "@/constants/ws";
import { utils } from "@/utils/utils";
import { SubUpdatePayload } from "@/schemas";

export default fp(async function (server: AppFastifyInstance) {
  // 更新状态，初始为 undefined
  server.decorate("updateCached", undefined);

  //-------------------- 订阅 Redis → 推送 WebSocket 客户端 ------------------
  const aisSub = await registerRelay(
    server,
    server.redisChannel.ais,
    WS_CHANNEL.AIS,
    (raw) => {
      const [utc, ts, mmsi, msg, content] = raw.split(",", 5);
      return {
        utc: parseInt(utc),
        ts,
        mmsi: parseInt(mmsi),
        msg: parseInt(msg),
        content: utils.base64ToStr(content),
      };
    },
    false
  );

  /**
   * 日志数据
   */
  const logSub = await registerRelay(
    server,
    server.redisChannel.log,
    WS_CHANNEL.LOG,
    (raw) => {
      let [utc, ts, tip, content] = raw.split(",", 4);
      let type = LOG_EVENT_TYPE.LOG_RUNNING;
      if (tip.includes("StorageSub_")) {
        type = LOG_EVENT_TYPE.LOG_STORAGE;
        tip = tip.split("_")[1];
      } else {
        // 只有运行日志入库
        content = utils.base64ToStr(content);
        server.logger.runningLog(parseInt(utc), ts, tip, content, type);
      }
      const log = { utc: parseInt(utc), ts, tip, content };
      return log;
    }
  );

  /**
   * 状态更新数据
   */
  const updateSub = await registerRelay(
    server,
    server.redisChannel.update,
    WS_CHANNEL.UPDATE,
    (raw) => {
      const data = <SubUpdatePayload>utils.base64ToObj(raw);
      const remotes = data.remote_servers ?? [];
      // 过滤掉 state=0（未启用）
      const filtered = remotes.filter((ele) => ele.state !== 0);
      const result: SubUpdatePayload = {
        ...data,
        remote_servers: filtered,
      };
      server.updateCached = result;
      return result;
    }
  );

  server.addHook("onClose", () => {
    aisSub?.quit();
    logSub?.quit();
    updateSub?.quit();
  });
});
