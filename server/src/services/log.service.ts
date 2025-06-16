import { Database } from "better-sqlite3";
import { LOG_EVENT_TYPE, LOG_LEVEL } from "@/constants/log";
import { utils } from "@/utils/utils";
import { FastifyRequest } from "fastify";
import { AppFastifyInstance } from "@/types/fastify-instance";
const isDev = process.env.NODE_ENV === "development";
export class LoggerService {
  private db: Database;
  private server: AppFastifyInstance;

  constructor(db: Database, server: AppFastifyInstance) {
    this.db = db;
    this.server = server;
  }

  /**
   * 通用日志记录方法
   * @param request 请求对象
   * @param eventType 事件类型（如用户登录、系统启动）
   * @param logType 日志级别（info、warn、error、debug）
   * @param operationDesc 详细描述
   * @param hostName 服务器主机名（可选）
   * @param sourceIp 来源IP（可选）
   * @param destinationIp 目标IP（可选）
   * @param browserName 浏览器信息（可选）
   * @param status   使用statu 作为日志分类 status 0 主控服务 1 日常事件 2 超管日常事件
   * @param errorMsg 错误信息（可选）
   * @param durationMs 操作耗时（毫秒）
   */
  private logEvent(
    request: any,
    eventType: LOG_EVENT_TYPE,
    logLevel: LOG_LEVEL,
    operationDesc: string,
    status: number,
    hostName: string = "",
    sourceIp: string = "",
    destinationIp: string = "",
    browserName: string = "",
    errorMsg: string = "",
    durationMs: number = 0
  ) {
    try {
      let userId = "",
        username = "";
      if (request) {
        const user = request?.user as any;
        userId = user ? user.id : "";
        username = user ? user.username : "";
        const clientInfo = utils.getClientInfo(request);
        if (!sourceIp) {
          sourceIp = clientInfo.ip;
        }
        browserName = clientInfo.userAgent;
      }
      const insertSql = `
      INSERT INTO tbl_loginfo 
       (id, eventType, logType, userId, username, hostName, sourceIp, destinationIp, tip,
       operationDesc, browserName, status, errorMsg, durationMs,utc,ts, sysCreated,sysUpdated)
       VALUES 
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?);
    `;
      const stmt = this.db.prepare(insertSql);
      const id = utils.genUUID();
      const utc = Date.now();
      const time = utils.getCurrentTime(utc);
      // utc 毫秒数转格式： 2025-05-28_18:20:17.107
      const ts = utils.getProtocolTime(utc);
      stmt.run(
        id,
        "日常事件",
        logLevel,
        userId,
        username,
        hostName,
        sourceIp,
        destinationIp,
        eventType,
        operationDesc,
        browserName,
        status,
        errorMsg,
        durationMs,
        utc,
        ts,
        time,
        time
      );
    } catch (err) {
      this.server.log.error(err, "事件日志写入失败");
    }
  }

  /**
   * 运行日志
   * ${utc}:${ts}:${tip}:${content}
   * @description 运行存入 tbl_loginfo
   */
  runningLog(
    utc: number,
    ts: string,
    tip: string,
    content: string,
    type: LOG_EVENT_TYPE
  ) {
    try {
      //     const insertSql = `
      //     INSERT INTO tbl_runninglog
      //      (id, utc,ts,tip, content, sysCreated,sysUpdated)
      //      VALUES
      //      (?, ?, ?, ?, ?, ?,?);
      //  `;
      const insertSql = `
      INSERT INTO tbl_loginfo 
       (id, eventType, logType, userId, username,tip,
       operationDesc,ts,utc,status, durationMs, sysCreated,sysUpdated)
       VALUES 
       (?, ?, ?, ?, ?, ?,?, ?,?, ?, ?,?,?);
    `;

      const stmt = this.db.prepare(insertSql);
      const time = utils.getCurrentTime(utc); // utc 毫秒数
      stmt.run(
        utils.genUUID(),
        type,
        "info",
        "",
        "",
        tip,
        content,
        ts,
        utc,
        0,
        0,
        time,
        time
      );
    } catch (err) {
      this.server.log.error(err, "运行日志写入失败");
    }
  }

  info(
    request: FastifyRequest,
    eventType: LOG_EVENT_TYPE,
    operationDesc: string,
    status: number = 1
  ) {
    this.logEvent(request, eventType, LOG_LEVEL.INFO, operationDesc, status);
  }

  error(
    request: FastifyRequest,
    eventType: LOG_EVENT_TYPE,
    operationDesc: string,
    errorMsg = "",
    status: number = 1
  ) {
    this.logEvent(
      request,
      eventType,
      LOG_LEVEL.ERROR,
      operationDesc,
      status,
      "",
      "",
      "",
      "",
      errorMsg
    );
  }
}
