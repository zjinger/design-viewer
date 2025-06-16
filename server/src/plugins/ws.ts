import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import { WebSocket } from "ws";
import { utils } from "@/utils/utils";
import { AppFastifyInstance } from "@/types/fastify-instance";
import { WS_CHANNEL, WS_REQ_CHANNEL, WS_REQ_ACTION } from "@/constants/ws";
import { WsRequestBody, WsResponseBody } from "@/schemas";
import { AlertLog, PongLog } from "@/schemas/LogInfo";
import { exec } from "child_process"; // 加在顶部
import { LOG_EVENT_TYPE } from "@/constants/log";
export default fp(async function (server: AppFastifyInstance) {
  await server.register(websocket);

  const clients = new Set<WebSocket>();
  // @ts-ignore
  server.decorate("wsClients", clients);

  // 单独推送
  const sendToClient = <T>(
    socket: WebSocket,
    channel: WS_CHANNEL,
    payload: T,
    error = "",
    action?: WS_REQ_ACTION
  ) => {
    const res: WsResponseBody<T> = {
      channel,
      timestamp: utils.getUTC(),
      payload,
      error,
    };
    if (action) {
      res.action = action;
    }
    socket.send(JSON.stringify(res));
  };

  // 推送给所有客户端
  const sendAll = <T>(
    channel: WS_CHANNEL,
    payload: T,
    error = "",
    action?: WS_REQ_ACTION
  ) => {
    const res: WsResponseBody<T> = {
      channel,
      timestamp: utils.getUTC(),
      payload,
      error,
    };
    if (action) {
      res.action = action;
    }
    const resMsg = JSON.stringify(res);
    for (const ws of clients) {
      if (ws.readyState === 1) {
        ws.send(resMsg);
      }
    }
  };

  server.get("/ws", { websocket: true }, (socket, req) => {
    // 每个连接独立维护一个“订阅频道集合”
    (socket as any).subChannels = new Set<string>();
    clients.add(socket);
    server.log.info(`[WebSocket] client connected: ${req.ip}`);
    socket.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WsRequestBody;
        const { channel, payload, action } = msg;
        switch (channel) {
          // 心跳检测
          case WS_REQ_CHANNEL.PING:
            try {
              // 检测用户token是否过期
              const token = payload?.token;
              server.jwt.verify(token);
              sendToClient<PongLog>(socket, WS_CHANNEL.PONG, { message: "ok" });
            } catch (e) {
              sendToClient<AlertLog>(
                socket,
                WS_CHANNEL.ALERT,
                { message: "Token 已过期或无效" },
                "401"
              );
              socket.close(4001, "token expired");
            }
            break;
          // 重启
          case WS_REQ_CHANNEL.CMD:
            if (action === WS_REQ_ACTION.REBOOT) {
              server.log.info("[REBOOT]", action);
              // TODO:执行shell 脚本
              sendAll<AlertLog>(
                WS_CHANNEL.ALERT,
                { message: "系统重启中" },
                "",
                WS_REQ_ACTION.REBOOT
              );
              // 延迟 3 秒执行 reboot，确保客户端收到消息
              setTimeout(() => {
                exec("reboot", (err, stdout, stderr) => {
                  if (err) {
                    server.log.error("重启失败:", err);
                    sendAll<AlertLog>(
                      WS_CHANNEL.ALERT,
                      { message: "重启失败" },
                      err && err.message,
                      WS_REQ_ACTION.REBOOT
                    );
                    server.logger.error(
                      req,
                      LOG_EVENT_TYPE.SYSTEM_REBOOT,
                      "设备重启失败"
                    );
                  } else {
                    server.log.info("设备正在重启...");
                    server.logger.info(
                      req,
                      LOG_EVENT_TYPE.SYSTEM_REBOOT,
                      "设备重启成功"
                    );
                  }
                });
              }, 3000);
            }
            break;
          case WS_REQ_CHANNEL.AIS_START:
            // 开始推送
            // 将 AIS 频道加入该 socket 的订阅集合
            (socket as any).subChannels.add(WS_CHANNEL.AIS);
            server.log.info("[AIS_START],开启推送");
            break;
          case WS_REQ_CHANNEL.AIS_STOP:
            // 停止推送
            (socket as any).subChannels.delete(WS_CHANNEL.AIS);
            server.log.info("[AIS_STOP],停止推送ais");
            break;
          default:
            sendToClient<AlertLog>(
              socket,
              WS_CHANNEL.ALERT,
              { message: "未知频道" },
              "404"
            );
        }
      } catch (err) {
        sendToClient<AlertLog>(
          socket,
          WS_CHANNEL.ALERT,
          { message: "JSON 解析失败" },
          "500"
        );
        server.log.error("[WS] JSON 解析失败", raw.toString());
      }
    });

    socket.on("close", (code) => {
      clients.delete(socket);
      server.log.info(`[WebSocket] client disconnected: ${req.ip}`);
    });
  });

  server.addHook("onClose", () => {
    server.log.info("[WS] 所有客户端断开");
    clients.clear();
  });
});
