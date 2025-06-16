/**
 * @description  升级 WebSocket 服务（独立 Node 进程）：
 *
 * 该服务用于船载终端升级期间的 WebSocket 进度推送。
 * 1. 启动后立即执行 /opt/upgrade/upgrade.sh <tar.gz>
 * 2. 实时读取 stdout 推送进度
 * 3. 退出码 0 => done, else => error
 * 4. 最后自动 fastify.close() + process.exit()
 * @author ZhangJing
 * @Date 2025-04-10
 */
import Fastify, { FastifyInstance } from "fastify";
import websocket, { WebSocket } from "@fastify/websocket";
import path from "path";
import { spawn } from "child_process";
import { utils } from "./utils/utils";
import fs from "fs-extra";
import Database from "better-sqlite3";
import { LoggerService } from "./services/log.service";
import { LOG_EVENT_TYPE } from "./constants/log";
import { getFirmwareInfo } from "./utils/getNewVersion";
import { AppFastifyInstance } from "./types/fastify-instance";
import { WS_CHANNEL } from "./constants/ws";
import { UpgradeLog, WsResponseBody } from "./schemas";
import { getDbFilePath, getUpgradeEnv, getUploadDir } from "./utils/getEnvPath";
const upgradeEnvOpt = getUpgradeEnv();
const WS_CLIENTS = new Set<WebSocket>();
let fastify: FastifyInstance;
let lastPayload = ""; // 用于重连立即推送
let db: Database.Database;
let logService: LoggerService;

/** ════════ 日志推送 ════════════════════════════════════════ */
function push(status: string, msg: string, progress: number | null) {
  const res: WsResponseBody<UpgradeLog> = {
    channel: WS_CHANNEL.UPGRADE,
    timestamp: new Date().toISOString(),
    payload: {
      status,
      message: msg,
      progress,
    },
  };
  const payload = JSON.stringify(res);
  lastPayload = payload; // 缓存
  if (status == "error") {
    fastify.log.error(payload);
  } else {
    fastify.log.info(payload);
  }
  for (const c of WS_CLIENTS) c.readyState === 1 && c.send(payload);
}

/* ════════ 进度提取 ════════════════════════════════════ */

function progressOf(line: string): number | null {
  const m = line.match(/\[step:(\d+)\/(\d+)]/);
  if (!m) return null;
  const [, s, t] = m;
  return Math.floor((+s / +t) * 100);
}

/* ════════ 升级主逻辑 ══════════════════════════════════ */

function runUpgrade() {
  push("installing", "[升级中]", 6); // 页面默认展示5%
  const p = spawn(upgradeEnvOpt.upgradeSh, [upgradeEnvOpt.firmwareTGZ], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  p.stdout.on("data", (d) => {
    String(d) // 转字符串
      .split(/\r?\n/) // 保证逐行
      .filter(Boolean) // 去掉空行
      .forEach((line) => {
        const progress = progressOf(line);
        if (progress !== null) {
          push("progressing", line, progress);
        }
      });
  });

  p.stderr.on("data", (d) => push("error", `[stderr] ${d.toString()}`, null));

  p.on("close", async (code, signal) => {
    const ok = code === 0;
    push(
      ok ? "done" : "error",
      ok ? "[升级完成]" : `[升级失败，退出码:${code}]`,
      ok ? 100 : null
    );

    /* ─ 写入升级结果 ─ */
    if (ok) {
      try {
        const insert = db.prepare(`
            INSERT INTO TBL_UPGRADE (id, firmwareVer, upgradeStatus,sysCreated,sysUpdated)
            VALUES (?, ?, ?,?,?)
          `);
        // 系统升级记录
        const uploadDir = getUploadDir("firmware_web");
        const { version: newVersion, description } = getFirmwareInfo(uploadDir);
        const time = utils.getCurrentTime();
        insert.run(
          utils.genUUID(),
          `${newVersion}&${description}`,
          1,
          time,
          time
        );
      } catch (e) {
        fastify.log.error(e, "写入升级记录失败");
      }
    }
    const eventType = LOG_EVENT_TYPE.FIRMWARE_UPDATE;
    ok
      ? logService.info(null, eventType, "WEB 服务升级成功")
      : logService.error(null, eventType, "WEB 服务升级失败");
    try {
      await fastify.close();
    } catch (_) {}
    db.close();
    process.exit(ok ? 0 : 1);
  });
}

/* ════════ Fastify + WS ════════════════════════════════ */
async function bootstrap() {
  const LOG_DIR = upgradeEnvOpt.upgradeLogDir;
  await fs.ensureDir(LOG_DIR);
  fastify = Fastify({
    logger: upgradeEnvOpt.isDev
      ? true
      : {
          level: "info",
          timestamp: () => `,"time":"${utils.getUTC()}"`,
          transport: {
            target: "pino/file",
            options: {
              destination: path.join(
                LOG_DIR,
                `upgrade_${utils.getOnedayTimeName()}.log`
              ),
            },
          },
        },
  });
  await fastify.register(websocket);

  /* ════════ 数据库升级记录 ════════════════════════════════════ */
  // const dbPath = path.join(DATABASE_PATH, `${DB_NAME}.db`);
  const dbPath = getDbFilePath();
  db = new Database(dbPath);

  logService = new LoggerService(db, fastify as AppFastifyInstance);
  /* ════════ WS 路由 ════════════════════════════════════ */
  fastify.get("/ws", { websocket: true }, (sock, req) => {
    WS_CLIENTS.add(sock);
    fastify.log.info(`WS client ${req.ip} connected (${WS_CLIENTS.size})`);
    // 重连立即推送上一次状态
    if (lastPayload) sock.send(lastPayload);
    sock.on("close", () => {
      WS_CLIENTS.delete(sock);
      fastify.log.info(`WS client ${req.ip} disconnected`);
    });
  });

  fastify.addHook("onClose", () => {
    WS_CLIENTS.clear();
    fastify.log.info("[Upgrade WS] 所有客户端断开");
  });
  const { port, host, isDev } = upgradeEnvOpt;
  await fastify.listen({ port, host }).catch((err) => {
    console.error("[UpgradeWS] 端口被占用？", err);
    process.exit(1);
  });
  console.log(`升级监控 WS 服务已启动: ws://${host}:${port}/ws`);
  if (!isDev) {
    //1s 后开始执行升级脚本
    setTimeout(runUpgrade, 1_000);
  } else {
    // 模拟升级过程
  }
}
// unhandledRejection 事件处理 退出进程
process.on("unhandledRejection", (reason, promise) => {
  const message = `Unhandled Rejection at: ${promise}, reason: ${reason}`;
  console.log("[Upgrade WS unhandledRejection]", message);
  process.exit(1);
});

bootstrap();
