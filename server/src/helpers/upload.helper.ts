// upload.helper.ts
import { FastifyRequest } from "fastify";
import path from "path";
import fs from "fs-extra";
import { Database } from "better-sqlite3";
import { AppError, ERRORS } from "./errors.helper";
import { IUploadsInfoType, IUserInfoDto } from "@/schemas";
import { getUploadDir } from "@/utils/getEnvPath";
import { utils } from "@/utils/utils";

export interface UploadFile {
  id: string;
  projectId: string;
  parentId?: string;
  fileName: string;
  storedName: string;
  filePath: string;
  fileType: string;
  category?: string;
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
    const insertFile = db.prepare(`
      INSERT INTO tbl_files
        (id, projectId, fileName, storedName, filePath, fileSize, fileType, category, parentId, uploaderId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertFile.run(
      model.id,
      model.projectId,
      model.fileName,
      model.storedName,
      model.filePath,
      model.fileSize,
      model.fileType,
      model.category || null,
      model.parentId || null,
      model.uploaderId || null
    );

    // 维护多对多关联
    const linkStmt = db.prepare(`
      INSERT OR IGNORE INTO tbl_projects_files (projectId, fileId)
      VALUES (?, ?)
    `);
    linkStmt.run(model.projectId, model.id);
  } catch (e) {
    throw new AppError("数据库写入失败", 500);
  }
}

/**
 * 通用文件上传
 * @param req Fastify 请求
 * @param category 上传类型（区分目录）
 * @param projectId 所属项目 ID
 * @param parentId 可选：上级文件夹 ID
 * @param db 可选：better-sqlite3 实例
 */
export const saveFile = async (
  req: FastifyRequest,
  category: IUploadsInfoType,
  projectId: string,
  parentId?: string,
  db?: Database
) => {
  const data = await req.file();
  if (!data) throw new AppError(ERRORS.fileNotFound.message);

  const id = utils.genUUID();
  const originalName = data.filename;
  const ext = originalName.toLowerCase().endsWith(".tar.gz")
    ? ".tar.gz"
    : path.extname(originalName);
  const timestamp = utils.getTimeName();
  const storedName = `${id}_${timestamp}${ext}`;

  const dir = getUploadDir(category);
  await fs.ensureDir(dir);

  const filePath = path.join(dir, storedName);
  try {
    await pumpStream(data.file, fs.createWriteStream(filePath));
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
    projectId,
    parentId,
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
      if (e instanceof AppError) throw e;
      throw new AppError(ERRORS.fileUploadError.message);
    }
  }

  return model;
};
