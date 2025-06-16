import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { RedisRpcController } from "./redis-rpc.controller";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs-extra";
import { AppError, ERRORS } from "@/helpers/errors.helper";
import { Readable } from "stream";
import { getStroageDbEnv } from "@/utils/getEnvPath";
import { IAisLogSearchDto } from "@/schemas/AisData";
import { utils } from "@/utils/utils";
/**
 * @description ais 数据查询，历史数据下载
 * @author ZhangJing
 * @date 2025-04-14 10:04
 * @export
 * @class AuthControllerImpl
 * @extends {RedisRpcController}
 */
export class AisControllerImpl extends RedisRpcController {
  private MAX_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 最多3天

  constructor(fatify: FastifyInstance) {
    super(fatify, "AisCfg");
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
    return `ais_${format(startTime)}_${format(endTime)}.json`;
  };
  // 根据 start/end 时间，生成 YYYY-MM-DD 列表
  private getDateList = (start: number, end: number): string[] => {
    const dates: string[] = [];
    let cur = new Date(start);
    cur.setUTCHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setUTCHours(0, 0, 0, 0);
    while (cur <= last) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return dates;
  };

  /**
   * 根据时间段和分页数据查询
   * @deprecated
   * @param startUtcMs
   * @param endUtcMs
   * @param offset
   * @param limit
   * @returns
   */
  private queryAisRange2 = (
    DB_DIR: string,
    startUtcMs: number,
    endUtcMs: number,
    offset: number,
    limit: number
  ): { rows: Array<Record<string, any>>; total: number } => {
    const dates = this.getDateList(startUtcMs, endUtcMs);
    const allRows: any[] = [];
    let total = 0;
    let collected = 0;
    let skip = offset;
    let need = limit;

    for (const d of dates) {
      const dbFile = path.join(DB_DIR, `ais-${d}.db`);
      if (!fs.existsSync(dbFile)) continue;
      const db = new Database(dbFile, { readonly: true });

      const countStmt = db.prepare(`
        SELECT COUNT(*) as cnt FROM tbl_ais WHERE utc BETWEEN ? AND ?
      `);
      const { cnt } = <{ cnt: number }>countStmt.get(startUtcMs, endUtcMs);
      total += cnt;

      if (cnt === 0) {
        db.close();
        continue;
      }

      if (skip >= cnt) {
        skip -= cnt;
        db.close();
        continue;
      }

      const stmt = db.prepare(`
        SELECT id, mmsi, msg, content, utc, ts, created_at
          FROM tbl_ais
         WHERE utc BETWEEN ? AND ?
         ORDER BY utc
         LIMIT ? OFFSET ?
      `);
      const rows = stmt.all(startUtcMs, endUtcMs, need, skip);
      allRows.push(...rows);
      collected += rows.length;

      db.close();

      if (collected >= limit) {
        break; // 本页收够了
      }

      skip = 0;
      need = limit - collected;
    }

    return { rows: allRows, total };
  };

  /**
   * 根据时间段和分页数据查询
   * @param startUtcMs
   * @param endUtcMs
   * @param offset
   * @param limit
   * @returns
   */
  private queryAisRange = (
    DB_DIR: string,
    startUtcMs: number,
    endUtcMs: number,
    offset: number,
    limit: number,
    order: "asc" | "desc" = "desc"
  ): { rows: Array<Record<string, any>>; total: number } => {
    const dates = this.getDateList(startUtcMs, endUtcMs);
    // —— 1. 先完整统计 total ——
    let total = 0;
    for (const d of dates) {
      const dbFile = path.join(DB_DIR, `ais-${d}.db`);
      if (!fs.existsSync(dbFile)) continue;
      const db = new Database(dbFile, { readonly: true });
      const { cnt } = <{ cnt: number }>(
        db
          .prepare(
            `SELECT COUNT(*) as cnt FROM tbl_ais WHERE utc BETWEEN ? AND ?`
          )
          .get(startUtcMs, endUtcMs)
      );
      total += cnt;
      db.close();
    }

    // —— 2. 再分页查询 rows ——
    const allRows: any[] = [];
    let skip = offset;
    let need = limit;
    for (const d of dates) {
      if (need <= 0) break;
      const dbFile = path.join(DB_DIR, `ais-${d}.db`);
      if (!fs.existsSync(dbFile)) continue;
      const db = new Database(dbFile, { readonly: true });

      const { cnt } = <{ cnt: number }>(
        db
          .prepare(
            `SELECT COUNT(*) as cnt FROM tbl_ais WHERE utc BETWEEN ? AND ?`
          )
          .get(startUtcMs, endUtcMs)
      );

      if (skip >= cnt) {
        skip -= cnt;
        db.close();
        continue;
      }

      const rows = db
        .prepare(
          `
        SELECT id, mmsi, msg, content, utc, ts, created_at
          FROM tbl_ais
         WHERE utc BETWEEN ? AND ?
         ORDER BY utc ${order}
         LIMIT ? OFFSET ?
      `
        )
        .all(startUtcMs, endUtcMs, need, skip);
      allRows.push(...rows);

      // 本页所需已拿够，则结束
      need -= rows.length;
      skip = 0;
      db.close();
    }

    return { rows: allRows, total };
  };

  /**
   * 历史AIS数据查询
   * @param request
   * @param reply
   * @returns
   */
  getList = async (
    request: FastifyRequest<{
      Body: IAisLogSearchDto;
    }>,
    reply
  ) => {
    try {
      const storageDbEvn = await getStroageDbEnv();
      // 不存在sd卡，无法找到对应的数据文件
      const {
        startTimeMs,
        endTimeMs,
        currentPage = 1,
        pageRecord = 20,
      } = request.body;

      if (!storageDbEvn.aisDbDir) {
        return this.handleSuccess(reply, {
          currentPage,
          pageRecord,
          total: 0,
          result: [],
          totalPages: 0, // 总页数
        });
      }
      // const startMs1 = new Date(startTime).getTime();
      // const endMs1 = new Date(endTime).getTime();
      const startMs = startTimeMs;
      const endMs = endTimeMs;
      const offset = (currentPage - 1) * pageRecord;
      const order = request.body.order === "asc" ? "asc" : "desc";
      const { rows, total } = this.queryAisRange(
        storageDbEvn.aisDbDir,
        startMs,
        endMs,
        offset,
        pageRecord,
        order
      );

      return this.handleSuccess(reply, {
        currentPage,
        pageRecord,
        total,
        result: rows,
        totalPages: Math.ceil(total / pageRecord), // 总页数
      });
    } catch (e) {
      return this.handleError(reply, ERRORS.aisLogListError, e);
    }
  };

  /**
   * 获取最早的数据保存时间
   * @param request
   * @param reply
   */
  getEarliestTime = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const storageDbEvn = await getStroageDbEnv();
      const DB_DIR = storageDbEvn.aisDbDir;
      if (!(await fs.pathExists(DB_DIR))) {
        // 无任何库文件
        return this.handleSuccess(reply, { ts: "", utc: 0 });
      }

      // 1. 列出所有符合命名规则的文件
      const files = (await fs.readdir(DB_DIR)).filter((f) =>
        /^ais-\d{4}-\d{2}-\d{2}\.db$/.test(f)
      );
      if (files.length === 0) {
        return this.handleSuccess(reply, { ts: "", utc: 0 });
      }

      // 2. 按文件名(日期)升序排序
      files.sort((a, b) => a.localeCompare(b));
      // utc today
      const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
      let earliestTs = "";
      let earliestUtc = Number.POSITIVE_INFINITY;

      // 3. 优先检查历史（不含今天）的最早文件
      const historyFiles = files.filter((f) => !f.includes(`ais-${today}.db`));
      if (historyFiles.length > 0) {
        const first = historyFiles[0];
        const dbPath = path.join(DB_DIR, first);
        const db = new Database(dbPath, { readonly: true });
        try {
          const row = db
            .prepare(`SELECT utc, ts FROM tbl_ais ORDER BY utc ASC LIMIT 1`)
            .get() as { utc: number; ts: string } | undefined;
          if (row) {
            earliestUtc = row.utc;
            earliestTs = row.ts;
          }
        } finally {
          db.close();
        }
      }

      // 4. 如果历史没数据，再检查今天的库
      if (!earliestTs && files.includes(`ais-${today}.db`)) {
        const todayPath = path.join(DB_DIR, `ais-${today}.db`);
        const db = new Database(todayPath, { readonly: true });
        try {
          const row = db
            .prepare(`SELECT utc, ts FROM tbl_ais ORDER BY utc ASC LIMIT 1`)
            .get() as { utc: number; ts: string } | undefined;
          if (row) {
            earliestUtc = row.utc;
            earliestTs = row.ts;
          }
        } finally {
          db.close();
        }
      }

      // 5. 如果仍然没取到，返回空
      if (!earliestTs) {
        return this.handleSuccess(reply, { ts: "", utc: 0 });
      }

      return this.handleSuccess(reply, { ts: earliestTs, utc: earliestUtc });
    } catch (error) {
      return this.handleError(reply, ERRORS.aisLogEarliestTimeError, error);
    }
  };

  /**
   * 下载csv 日志文件
   * @param request
   * @param reply
   * @returns
   */
  downloadCsv = async (
    request: FastifyRequest<{
      Body: IAisLogSearchDto;
    }>,
    reply: FastifyReply
  ) => {
    const { startTime, endTime, startTimeMs, endTimeMs } = request.body;
    const startMs = startTimeMs;
    const endMs = endTimeMs;
    if (endMs - startMs > this.MAX_DURATION_MS) {
      return this.handleError(
        reply,
        new AppError("最多支持导出3天数据，请缩短时间范围", 400)
      );
    }
    const filename = this.formatFilename(startTime, endTime).replace(
      /\.json$/,
      ".csv"
    );
    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${filename}"`);

    const dates = this.getDateList(startMs, endMs);
    let isHeaderPushed = false;
    let index = 1; // 序号计数器
    const storageDbEvn = await getStroageDbEnv();
    const DB_DIR = storageDbEvn.aisDbDir;
    const order = request.body.order === "asc" ? "asc" : "desc";
    const csvStream = new Readable({
      async read() {
        // 定义列顺序
        const columns = ["No.", "时间（UTC）", "语句", "MMSI", "消息类型"];
        // 推送表头
        if (!isHeaderPushed) {
          this.push(columns.join(",") + "\n");
          isHeaderPushed = true;
        }
        for (const d of dates) {
          const dbPath = path.join(DB_DIR, `ais-${d}.db`);
          if (!fs.existsSync(dbPath)) continue;

          let db: Database.Database;
          try {
            db = new Database(dbPath, { readonly: true });
            const stmt = db.prepare(`
          SELECT mmsi, msg, content, utc, ts
          FROM tbl_ais
          WHERE utc BETWEEN ? AND ?
          ORDER BY utc ${order}
        `);
            const rows: any = stmt.iterate(startMs, endMs);
            for (const row of rows) {
              const time = utils.getCurrentUTCTime(row.utc);
              const timeCell = `="${time}"`;
              const cols = [
                index++, // 序号
                timeCell,
                // 做简单的双引号转义
                `"${String(row.content).replace(/"/g, '""')}"`,
                row.mmsi,
                row.msg,
              ];
              this.push(cols.join(",") + "\n");
            }
          } catch (e) {
            //  this.push(`"${index++}","error","读取失败:${d}","","",""\n`);
          } finally {
            db?.close();
          }
        }
        // 流结束
        this.push(null);
      },
    });
    return reply.send(csvStream);
  };
}
