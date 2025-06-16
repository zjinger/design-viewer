import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { saveFile } from "@/helpers/upload.helper";
import { AppError, ERRORS } from "@/helpers/errors.helper";
import { LOG_EVENT_TYPE } from "@/constants/log";
import path from "path";
import fs from "fs-extra";
import { exec } from "child_process";
import util from "util";
import { createHash } from "crypto";
import { IUploadsInfoDto, IUploadsInfoType, SubConfControl } from "@/schemas";
import { RedisRpcController } from "./redis-rpc.controller";
import { getUpgradeEnv } from "@/utils/getEnvPath";
const execAsync = util.promisify(exec); // 转为 Promise 风格

/* ------------------------------ 工具函数 ------------------------------ */

async function md5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("md5");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (c) => hash.update(c));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function sh(cmd: string, cwd?: string) {
  const { stdout, stderr } = await execAsync(cmd, { cwd });
  if (stderr) throw new AppError(stderr);
  return stdout.trim();
}

/**
 * @description 固件升级
 * 1、主控固件
 * 2、web服务
 * @author ZhangJing
 * @date 2025-04-14 11:04
 * @export
 * @class UpgradeControllerImpl
 * @extends {BaseControllerImpl}
 */
export class UpgradeControllerImpl extends RedisRpcController {
  constructor(fastify: FastifyInstance) {
    super(fastify);
  }

  /**
   * @description 上传升级固件
   * @author ZhangJing
   * @date 2025-03-26 14:31
   * @param {FastifyRequest} request
   * @param {FastifyReply} reply
   * @returns {Promise<void>}
   */
  upgrade = async (
    request: FastifyRequest<{
      Params: { type: "main" | "web" }; // main： 主控固件 web：Web服务
    }>,
    reply: FastifyReply
  ) => {
    const type = request.params.type;
    try {
      if (type !== "main" && type !== "web") {
        return this.handleError(reply, ERRORS.firmwareUploadTypeError);
      }
      const category: IUploadsInfoType =
        type === "main" ? "firmware_main" : "firmware_web";
      const file = await saveFile(request, category, this.db);
      this.log.info(
        request,
        LOG_EVENT_TYPE.FIRMWARE_UPDATE,
        `${type}固件上传成功：${file.fileName}`
      );
      return this.handleSuccess(reply, {
        id: file.id,
        status: "进入升级流程",
      });
    } catch (e) {
      return this.handleError(reply, ERRORS.firmwareUploadError, e);
    }
  };

  /**
   *
   * @param request
   * @param reply
   */
  handleMainUpgrade = async (
    request: FastifyRequest<{
      Params: { id: string }; // id 升级包文件保存的id
    }>,
    reply: FastifyReply
  ) => {
    const id = request.params.id;
    const file = this.db
      .prepare("SELECT id, filePath FROM TBL_UPLOADS WHERE id = ?")
      .get(id) as IUploadsInfoDto;
    if (!file) {
      return this.handleError(reply, ERRORS.firmwareNotFound);
    }
    const tarGz = file.filePath;
    if (!tarGz.endsWith(".tar.gz")) {
      return this.handleError(reply, ERRORS.firmwareExtError);
    }
    // 固件升级
    try {
      const result = await this.rpcSet<SubConfControl>("control", reply, {
        cmd: 2,
        arg1: 0,
        arg2: tarGz, // 文件名和路径
      });
      this.logger.info(request, LOG_EVENT_TYPE.FIRMWARE_UPDATE, "主控固件升级");
      return this.handleSuccess(reply, result);
    } catch (e) {
      return this.handleError(reply, ERRORS.resetConfError, e);
    }
  };
  /**
   * @description 处理Web 服务升级
   *
   * 步骤：固件上传成功后，先解压，再执行md5校验，校验通过后执行升级脚本
   * @author ZhangJing
   * @date 2025-04-15 17:04
   * @private
   * @param {FastifyRequest} request
   * @param {UploadFile} file
   * @memberof UpgradeControllerImpl
   */
  handleWebUpgrade = async (
    request: FastifyRequest<{
      Params: { id: string }; // id 升级包文件保存的id
    }>,
    reply: FastifyReply
  ) => {
    try {
      const id = request.params.id;
      const file = this.db
        .prepare("SELECT id, filePath FROM TBL_UPLOADS WHERE id = ?")
        .get(id) as IUploadsInfoDto;
      if (!file) {
        return this.handleError(reply, ERRORS.firmwareNotFound);
      }
      const tarGz = file.filePath;
      if (!tarGz.endsWith(".tar.gz")) {
        return this.handleError(reply, ERRORS.firmwareExtError);
      }
      const uploadDir = path.dirname(tarGz);
      const unpackDir = path.join(uploadDir, "unpacked");
      await fs.ensureDir(unpackDir);
      await fs.emptyDir(unpackDir);
      this.log.info(`解压目录 ${unpackDir}`);
      this.log.info(`开始解包 ${tarGz}`);
      // // Step 1: 解压 .gz
      await sh(`gzip -df ${tarGz}`); // -> .tar
      const tarFile = tarGz.replace(/\.gz$/, "");
      // Step 2: 解包 .tar
      await sh(`tar -xf ${tarFile} -C ${unpackDir}`);
      this.log.info(`解压完成`);
      // 2️⃣ 校验结构完整性
      const fwPath = path.join(unpackDir, "firmware_web.tar.gz");
      const signPath = path.join(unpackDir, "sign.txt");
      if (!(await fs.pathExists(fwPath)) || !(await fs.pathExists(signPath))) {
        return this.handleError(reply, new AppError("升级包内容不完整"));
      }
      // 3️⃣ 读取 sign.txt 并校验 MD5
      const expected = (await fs.readFile(signPath, "utf-8"))
        .split(" ")[0]
        .trim();
      const actual = await md5(fwPath);
      if (expected !== actual) {
        return this.handleError(reply, new AppError("MD5 校验失败"));
      }
      const upgradeEnv = getUpgradeEnv();
      // 4️⃣ 拷贝 firmware_web.tar.gz 到标准路径
      const TARGET_TGZ = upgradeEnv.firmwareTGZ;
      await fs.copyFile(fwPath, TARGET_TGZ);
      // 5️⃣ 启动升级脚本
      const UPGRADE_RUN_SH = upgradeEnv.upgradeRunSh;
      if (!UPGRADE_RUN_SH) {
        return this.handleError(
          reply,
          new AppError("升级脚本upgradeRunSh不存在")
        );
      }
      if (!upgradeEnv.upgradeSh) {
        return this.handleError(reply, new AppError("升级脚本upgradeSh不存在"));
      }
      this.log.info(`触发 ${UPGRADE_RUN_SH}`);
      // 执行脚本
      await sh(`bash ${UPGRADE_RUN_SH}`);
      this.logger.info(
        request,
        LOG_EVENT_TYPE.FIRMWARE_UPDATE,
        "WEB服务正在升级中..."
      );
      return this.handleSuccess(reply, {}, "升级中...");
    } catch (e) {
      return this.handleError(reply, ERRORS.firmwareUpgradeError, e);
    }
  };
}
