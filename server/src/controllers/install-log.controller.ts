import { FastifyReply, FastifyRequest } from "fastify";
import { BaseControllerImpl } from "./base.controller";
import {
  IInstallationLogDto,
  IInstallationLogSearchDto,
} from "@/schemas/InstallationLog";
import { AppError, ERRORS } from "@/helpers/errors.helper";
import { IUploadsInfoDto } from "@/schemas";
import { utils } from "@/utils/utils";
import { getUploadDir } from "@/utils/getEnvPath";
import path from "path";
import fs from "fs-extra";
import { saveFile } from "@/helpers/upload.helper";
/**
 * @description 安装日志
 * 支持pdf/图片上传，支持查询、新增、查看详情
 * @author ZhangJing
 * @date 2025-05-19 17:05
 * @export
 * @class InstallLogControllerImpl
 * @extends {BaseControllerImpl}
 */
export class InstallLogControllerImpl extends BaseControllerImpl {
  getList = async (
    request: FastifyRequest<{
      Body: IInstallationLogSearchDto;
    }>,
    reply: FastifyReply
  ) => {
    try {
      // 1. 从 body 取分页和筛选条件
      const {
        startTime,
        endTime,
        keyword,
        currentPage = 1,
        pageRecord = 20,
      } = request.body;
      const order = request.body.order === "asc" ? "asc" : "desc";
      const offset = (currentPage - 1) * pageRecord;
      const db = this.db;
      // 3. 构造 WHERE 条件
      const whereClauses: string[] = ["l.sysDeleted = 0"];
      const params: (string | number)[] = [];
      // if (deviceName) {
      //   whereClauses.push(`l.deviceName LIKE ?`);
      //   params.push(`%${deviceName}%`);
      // }
      // if (operator) {
      //   whereClauses.push(`l.operator LIKE ?`);
      //   params.push(`%${operator}%`);
      // }
      if (keyword) {
        whereClauses.push(`(l.deviceName LIKE ? OR l.operator LIKE ?)`);
        params.push(`%${keyword}%`, `%${keyword}%`);
      }

      if (startTime) {
        whereClauses.push(`l.installDate >= ?`);
        params.push(startTime);
      }
      if (endTime) {
        whereClauses.push(`l.installDate <= ?`);
        params.push(endTime);
      }

      const whereSql = whereClauses.length
        ? "WHERE " + whereClauses.join(" AND ")
        : "";
      // 4. 查询总数
      const countSql = `
      SELECT COUNT(*) AS count
      FROM tbl_installation_log l
      ${whereSql}
    `;
      const countStmt = db.prepare(countSql);
      const countRow = countStmt.get(...params) as { count: number };
      const total = countRow?.count ?? 0;

      // 5. 分页查询日志
      const logsStmt = db.prepare(`
      SELECT
        l.id,
        l.deviceName,
        l.installDate,
        l.operator,
        l.remark,
        l.sysCreated,
        l.sysUpdated,
        l.sysDeleted
      FROM tbl_installation_log l
      ${whereSql}
      ORDER BY l.installDate ${order}
      LIMIT ? OFFSET ?
    `);
      const rows = logsStmt.all(
        ...params,
        pageRecord,
        offset
      ) as IInstallationLogDto[];
      return this.handleSuccess(reply, {
        currentPage,
        pageRecord,
        total,
        result: rows,
        totalPages: Math.ceil(total / pageRecord), // 总页数
      });
    } catch (e) {
      return this.handleError(reply, ERRORS.installLogListError, e);
    }
  };
  getInfo = async (
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      // 1. 同步查询安装日志
      const logStmt = this.db.prepare(`
      SELECT
        id,
        deviceName,
        installDate,
        operator,
        remark,
        sysCreated,
        sysUpdated,
        sysDeleted
      FROM tbl_installation_log
      WHERE id = ?
        AND sysDeleted = 0
    `);
      const logRow = logStmt.get(id) as IInstallationLogDto;

      if (!logRow) {
        return this.handleError(reply, ERRORS.installLogInfoError);
      }
      // 2. 同步查询该日志的附件
      const uploadsStmt = this.db.prepare(`
      SELECT
        id,
        fileName,
        storedName,
        filePath,
        fileSize,
        fileType,
        category,
        uploaderId,
        sysCreated,
        sysUpdated
      FROM tbl_uploads
      WHERE refTable = 'tbl_installation_log'
        AND refId = ?
        AND sysDeleted = 0
    `);
      const uploadList = uploadsStmt.all(id) as IUploadsInfoDto[];
      // 3. 返回组合后的 DTO
      const result: IInstallationLogDto = {
        ...logRow,
        uploadList,
      };
      return this.handleSuccess(reply, result);
    } catch (e) {
      return this.handleError(reply, ERRORS.installLogInfoError, e);
    }
  };
  delete = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const db = this.db;
      const uploads = db
        .prepare(
          `
        SELECT id, filePath
          FROM tbl_uploads
         WHERE refTable = 'tbl_installation_log'
           AND refId    = ?
           AND sysDeleted = 0
      `
        )
        .all(id) as { id: string; filePath: string }[];

      // 2. 开事务：软删除日志和附件
      db.exec("BEGIN TRANSACTION");
      try {
        // 标记日志为已删除
        db.prepare(
          `
        UPDATE tbl_installation_log
           SET sysDeleted = 1,
               sysUpdated = CURRENT_TIMESTAMP
         WHERE id = ?
      `
        ).run(id);

        // 标记附件为已删除
        db.prepare(
          `
        UPDATE tbl_uploads
           SET sysDeleted = 1,
               sysUpdated = CURRENT_TIMESTAMP
         WHERE refTable = 'tbl_installation_log'
           AND refId    = ?
      `
        ).run(id);

        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        return this.handleError(reply, ERRORS.installLogDeleteError, e);
      }
      // 3. 可选：物理删除文件（异步进行，不影响 API 响应）
      for (const { filePath } of uploads) {
        fs.remove(filePath).catch((err) => {
          this.log.error(`物理删除文件失败: ${filePath}`, err);
        });
      }
      return this.handleSuccess(reply, "");
    } catch (e) {
      return this.handleError(reply, ERRORS.installLogDeleteError, e);
    }
  };

  save = async (
    request: FastifyRequest<{
      Body: {
        deviceName?: string;
        installDate: string;
        operator: string;
        remark?: string;
        uploadList?: string[];
      };
    }>,
    reply: FastifyReply
  ) => {
    const {
      deviceName,
      installDate,
      operator,
      remark,
      uploadList = [],
    } = request.body;
    try {
      const db = this.db;
      const logId = utils.genUUID();
      // 1. 开事务:先写安装日志并关联 uploads
      db.exec("BEGIN TRANSACTION");
      try {
        // 2. 插入安装日志
        const insertLog = db.prepare(`
        INSERT INTO tbl_installation_log
          (id, deviceName, installDate, operator, remark,sysCreated,sysUpdated)
        VALUES
          (?, ?, ?, ?, ?,?,?)
      `);
        const time = utils.getCurrentTime();
        insertLog.run(
          logId,
          deviceName,
          installDate,
          operator,
          remark ?? null,
          time,
          time
        );

        // 3. 批量关联附件：把 tbl_uploads.refTable/refId 更新到当前日志
        if (uploadList.length) {
          const placeholders = uploadList.map(() => "?").join(",");
          const updateUploads = db.prepare(`
          UPDATE tbl_uploads
             SET refTable = 'tbl_installation_log',
                 refId    = ?,
                 sysUpdated = ?
           WHERE id IN (${placeholders})
        `);
          const updateTime = utils.getCurrentTime();
          updateUploads.run(logId, updateTime, ...uploadList);
        }

        // 4. 提交事务
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        return this.handleError(reply, ERRORS.installLogSaveError, err);
      }
      const uploads: IUploadsInfoDto[] = db
        .prepare(
          `
        SELECT * FROM tbl_uploads
         WHERE refTable='tbl_installation_log'
           AND refId=?
           AND sysDeleted=0
      `
        )
        .all(logId) as IUploadsInfoDto[];
      const failedMoves: string[] = [];
      // 移动文件并更新 filePath
      for (const f of uploads) {
        const tempPath = f.filePath; // e.g. /.../uploads/temp/install/uuid_xxx.png
        const permDir = getUploadDir(f.category, true); // e.g. /.../uploads/install
        const permPath = path.join(permDir, path.basename(tempPath)); // 保持文件名不变
        try {
          // 确保目标目录存在
          await fs.ensureDir(permDir);
          // 移动文件（覆盖同名）
          await fs.move(tempPath, permPath, { overwrite: true });
          // 更新 DB
          db.prepare(
            `
          UPDATE tbl_uploads
             SET filePath = ?, sysUpdated = CURRENT_TIMESTAMP
           WHERE id = ?
        `
          ).run(permPath, f.id);
          // 同步到 DTO
          f.filePath = permPath;
        } catch (e) {
          request.log.error(e, `移动文件 ${f.id} 失败：`);
          failedMoves.push(f.id);
          // 这里可根据业务决定：跳过继续处理其它文件，或整体报错并通知前端
        }
      }
      // 4. 查询安装日志本身
      return this.handleSuccess(
        reply,
        logId,
        failedMoves.length > 0
          ? `以下附件文件移动失败：${failedMoves.join(", ")}`
          : "success"
      );
    } catch (e) {
      this.log.error(e);
      return this.handleError(reply, ERRORS.installLogSaveError, e);
    }
  };

  upload = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const file = await saveFile(request, "install_log", this.db);
      this.log.info(`附件上传成功：${file.fileName}`);
      return this.handleSuccess(reply, file);
    } catch (e) {
      return this.handleError(reply, ERRORS.installLogUploadError, e);
    }
  };

  preview = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const db = this.db;
      const file = db
        .prepare(
          `SELECT filePath, fileType ,fileName
             FROM tbl_uploads 
            WHERE id = ? 
              AND sysDeleted = 0`
        )
        .get(id) as { filePath: string; fileType: string; fileName: string };

      if (!file) {
        return this.handleError(reply, new AppError("文件不存在或已删除", 404));
      }
      // 2. 检查文件是否存在
      try {
        await fs.promises.access(file.filePath, fs.constants.R_OK);
      } catch {
        return this.handleError(reply, new AppError("文件已丢失", 404));
      }
      return reply
        .header("Content-Type", file.fileType)
        .header(
          "Content-Disposition",
          `inline; filename="${encodeURIComponent(
            path.basename(file.fileName)
          )}"`
        )
        .send(fs.createReadStream(file.filePath));
    } catch (e) {
      return this.handleError(reply, ERRORS.installLogPreviewError, e);
    }
  };
}
