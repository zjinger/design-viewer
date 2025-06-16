import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { BaseControllerImpl } from "./base.controller";
import { ILogInfoSearchDto } from "@/schemas/LogInfo";
import { AppError, ERRORS } from "@/helpers/errors.helper";
import { Readable } from "stream";
import { Database } from "better-sqlite3";
import { utils } from "@/utils/utils";

/**
 * @description 运行日志
 * @author ZhangJing
 * @date 2025-05-19 17:05
 * @export
 * @class LogControllerImpl
 * @extends {BaseControllerImpl}
 */
export class LogControllerImpl extends BaseControllerImpl {
  private MAX_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 最多3天
  constructor(fastify: FastifyInstance) {
    super(fastify);
  }
  private formatFilename = (startTime: string, endTime: string): string => {
    const format = (s: string) => {
      const d = new Date(s);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return (
        d.getFullYear().toString() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds())
      );
    };

    return `log_${format(startTime)}_${format(endTime)}.json`;
  };

  /**
   * 获取最早的数据保存时间
   * @param request
   * @param reply
   */
  getEarliestTime = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const row = <{ ts: string; utc: string }>(
        this.db
          .prepare(`SELECT ts,utc FROM tbl_loginfo ORDER BY utc ASC LIMIT 1`)
          .get()
      );
      return this.handleSuccess(reply, {
        ts: row.ts,
        utc: row.utc,
      });
    } catch (error) {
      return this.handleError(reply, ERRORS.logListError, error);
    }
  };

  /**
   * @description 下载日志，CSV 格式，带序号
   */
  downloadCsv = async (
    request: FastifyRequest<{
      Body: ILogInfoSearchDto;
    }>,
    reply: FastifyReply
  ) => {
    const { startTime, endTime, startTimeMs, endTimeMs, eventType } =
      request.body;
    const startMs = startTimeMs;
    const endMs = endTimeMs;
    if (endMs - startMs > this.MAX_DURATION_MS) {
      return this.handleError(
        reply,
        new AppError("最多支持导出3天数据，请缩短时间范围", 400)
      );
    }

    // 如果 formatFilename 已经带 .json 后缀，就替换为 .csv；
    const filename = this.formatFilename(startTime, endTime).replace(
      /\.json$/,
      ".csv"
    );

    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${filename}"`);

    let isHeaderPushed = false;
    let index = 1; // 序号计数器
    const db: Database = this.db; // 复用已有的 better-sqlite3 实例
    const order = request.body.order === "asc" ? "asc" : "desc";
    const isValidType = typeof eventType === "number";
    // 拼接 SQL 和参数
    const whereClause = isValidType
      ? `utc BETWEEN ? AND ? AND status = ?`
      : `utc BETWEEN ? AND ? AND status IN (0, 1)`;
    const params = isValidType ? [startMs, endMs, eventType] : [startMs, endMs];

    const csvStream = new Readable({
      read() {
        // 先推送表头
        if (!isHeaderPushed) {
          const header = ["No.", "时间（UTC）", "日志类型", "日志内容"];
          this.push(header.join(",") + "\n");
          isHeaderPushed = true;
        }

        try {
          const stmt = db.prepare(`
            SELECT id, operationDesc as content, tip,eventType, utc, ts, sysCreated, sysUpdated
              FROM tbl_loginfo
             WHERE ${whereClause}
             ORDER BY utc ${order}
          `);
          for (const row of <any>stmt.iterate(...params)) {
            const content = `"${String(row.content).replace(/"/g, '""')}"`;
            const tip = `"${String(row.tip).replace(/"/g, '""')}"`;
            const eventType = row.eventType;
            const time = utils.getCurrentUTCTime(row.utc);
            const timeCell = `="${time}"`;
            // 对含特殊字符的字段做简单的双引号转义
            const cols = [
              index++,
              timeCell,
              eventType,
              `${tip}：${content}`
            ];
            this.push(cols.join(",") + "\n");
          }
        } catch (err) {
          // 如果需要，可在这里记录失败信息
        } finally {
          // 流结束
          this.push(null);
        }
      },
    });

    return reply.send(csvStream);
  };

  /**
   * 历史运行日志查询
   * 1、显示存储中的最早日志时间，按时间段查询并下载
   * @param request
   * @param reply
   * @returns
   */
  getList = async (
    request: FastifyRequest<{
      Body: ILogInfoSearchDto;
    }>,
    reply: FastifyReply
  ) => {
    try {
      const {
        startTimeMs,
        endTimeMs,
        currentPage = 1,
        pageRecord = 20,
        eventType,
      } = request.body;
      const offset = (currentPage - 1) * pageRecord;
      const order = request.body.order === "asc" ? "asc" : "desc";
      // const startMs1 = new Date(startTime).getTime();
      // const endMs1 = new Date(endTime).getTime();
      const startMs = startTimeMs;
      const endMs = endTimeMs;
      let whereClause = `WHERE sysDeleted=0 AND utc BETWEEN ? AND ?`;
      let params: any[] = [startMs, endMs];

      if (typeof eventType === "number") {
        whereClause += ` AND status = ?`;
        params.push(eventType);
      } else {
        whereClause += ` AND status IN (0, 1)`;
      }
      // 查询日志
      const dataStmt = this.db.prepare(
        `SELECT id, operationDesc as content, tip, utc, ts,eventType,status,sysCreated, sysUpdated
       FROM tbl_loginfo
      ${whereClause}
       ORDER BY utc ${order}
       LIMIT ? OFFSET ?`
      );
      const result = dataStmt.all(...params, pageRecord, offset);
      // 查询总数
      const countStmt = this.db.prepare(
        `SELECT COUNT(*) as total
          FROM tbl_loginfo
         ${whereClause}`
      );
      const { total } = <{ total: number }>countStmt.get(...params);
      return this.handleSuccess(reply, {
        result, // 列表数据
        currentPage, // 当前页
        pageRecord, // 页容量
        total, // 总数
        startTimeMs, // 开始时间毫秒数
        endTimeMs, // 结束时间毫秒数
        totalPages: Math.ceil(total / pageRecord), // 总页数
      });
    } catch (err) {
      return this.handleError(reply, ERRORS.logListError, err);
    }
  };
}
