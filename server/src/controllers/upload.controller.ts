import { FastifyReply, FastifyRequest } from "fastify";
import { BaseControllerImpl } from "./base.controller";
import { ERRORS } from "@/helpers/errors.helper";
import fs from "fs-extra";
import { utils } from "@/utils/utils";
import { IUploadsInfoType } from "@/schemas";
const ALLOWED_UPLOAD_TYPES: IUploadsInfoType[] = [
  "config",
  "firmware_main",
  "firmware_web",
  "flow_tpl",
  "install_log",
];
export class UploadControllerImpl extends BaseControllerImpl {
  upload = async (
    request: FastifyRequest<{
      Querystring: {
        type: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const type = request.query.type as IUploadsInfoType;
      if (!ALLOWED_UPLOAD_TYPES.includes(type)) {
        return this.handleError(reply, ERRORS.invalidUploadType);
      }
      // const file = await saveFile(request, "install_log", this.db);
      // this.log.info(`附件上传成功：${file.fileName}`);
      // return this.handleSuccess(reply, file);
    } catch (e) {
      return this.handleError(reply, ERRORS.uploadError, e);
    }
  };

  remove = (
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const db = this.db; // better-sqlite3 实例
      // 1. 查出文件记录
      const rec = db
        .prepare(
          `
        SELECT filePath
          FROM tbl_uploads
         WHERE id = ?
           AND sysDeleted = 0
      `
        )
        .get(id) as { filePath: string } | undefined;

      if (!rec) {
        return this.handleError(reply, ERRORS.contentNotFoundError);
      }
      // 2. 物理删除文件（异步，不影响主流程）
      fs.remove(rec.filePath).catch((err: any) => {
        request.log.error(`物理删除文件失败 (${rec.filePath}):`, err);
      });
      // 3. 数据库标记为已删除
      const curTime = utils.getCurrentTime();
      db.prepare(
        `
      UPDATE tbl_uploads
         SET sysDeleted = 1,
             sysUpdated = ?
       WHERE id = ?
    `
      ).run(curTime, id);
      // 4. 返回结果
      return this.handleSuccess(reply, "");
    } catch (e) {
      return this.handleError(reply, ERRORS.contentRemoveError, e);
    }
  };
}
