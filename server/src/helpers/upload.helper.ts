import { utils } from "@/utils/utils";
import { FastifyRequest } from "fastify";
import path from "path";
import fs from "fs-extra";
import { AppError, ERRORS } from "./errors.helper";
import { Database } from "better-sqlite3";
import { IUploadsInfoType, IUserInfoDto } from "@/schemas";
import { getUploadDir } from "@/utils/getEnvPath";
export interface UploadFile {
  id: string;
  fileName: string;
  storedName: string;
  filePath: string;
  fileType: string;
  category: string;
  fileSize: number;
  uploaderId?: string;
}

function pumpStream(source: NodeJS.ReadableStream, dest: fs.WriteStream) {
  return new Promise<void>((resolve, reject) => {
    source.pipe(dest);
    source.on("error", reject);
    dest.on("error", reject);
    dest.on("close", resolve);
  });
}

export function saveFileToDb(db: Database, model: UploadFile) {
  try {
    const stmt = db.prepare(`
      INSERT INTO tbl_uploads
        (id, fileName, storedName, filePath, fileType, category, fileSize,uploaderId,sysCreated,sysUpdated)
      VALUES (?, ?, ?, ?, ?, ?, ?,?,?,?)
    `);
    const time = utils.getCurrentTime();
    stmt.run(
      model.id,
      model.fileName,
      model.storedName,
      model.filePath,
      model.fileType,
      model.category,
      model.fileSize,
      model.uploaderId || "",
      time,
      time
    );
  } catch (e) {
    throw new AppError("数据库写入失败", 500);
  }
}

/**
 * @description 通用文件上传
 * @param {FastifyRequest}
 * @param {string} category 上传类型 用于区分不同的上传文件类型 config firmware
 * @param {Database} 可选，将文件信息保存到数据库
 * @author ZhangJing
 */
export const saveFile = async (
  req: FastifyRequest,
  category: IUploadsInfoType,
  db?: Database
) => {
  const data = await req.file();
  if (!data) {
    throw new AppError(ERRORS.fileNotFound.message);
  }
  const id = utils.genUUID();
  const originalName = data.filename;
  const ext = originalName.toLowerCase().endsWith(".tar.gz")
    ? ".tar.gz"
    : path.extname(originalName);
  const timestamp = utils.getTimeName(); // 格式化的时间戳
  const storedName = `${id}_${timestamp}${ext}`;
  const dir = getUploadDir(category); // 上传目录
  const filePath = path.join(dir, storedName);
  const writeStream = fs.createWriteStream(filePath);
  try {
    await pumpStream(data.file, writeStream);
  } catch (e) {
    req.log.error(e);
    throw new AppError("写入文件失败", 500);
  }
  let stats: fs.Stats;
  try {
    stats = await fs.stat(filePath);
  } catch (e) {
    req.log.error(e);
    throw new AppError("获取文件信息失败", 500);
  }
  const model: UploadFile = {
    id,
    fileName: originalName,
    storedName,
    filePath,
    fileType: data.mimetype,
    category,
    fileSize: stats.size,
  };
  if (db) {
    try {
      const user = req.user as IUserInfoDto;
      model.uploaderId = user.id;
      saveFileToDb(db, model);
    } catch (e) {
      req.log.error(e);
      await fs.remove(filePath).catch(() => {});
      if (e instanceof AppError) {
        throw e;
      }
      throw new AppError(ERRORS.fileUploadError.message);
    }
  }
  return model;
};
