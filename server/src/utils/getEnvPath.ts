import path from "path";
import fs from "fs-extra";
import { IUploadsInfoType } from "@/schemas/Uploads";
import { utils } from "./utils";
import loadConfig from "@/config/env.config";
import { diskUtil } from "./disk";
import os from "os";
loadConfig();
const isDev = process.env.NODE_ENV === "development"; // 环境变量
const curDir = process.cwd();
const isWindows = os.platform() === "win32";
/**
 * 应用配置
 */
export interface AppEnvOpt {
  isDev: boolean;
  port: number;
  host: string;
  https: boolean;
  encrypt: boolean;
  bodyLimitSize: number; // 限制body容量，单位 MB
}

/**
 *  ais 日志存储策略
 */
export interface StorageEnvOpt {
  minFreeRatio: number; //空间剩余百分比 0 -1
  maxRetries: number; // sd卡写入最大尝试次数
  retentionDays: number; // 默认最长存储天数
}
/**
 *  ais 日志存储策略
 */
export interface StorageDbEnvOpt {
  mountedState: boolean; // sd卡是否挂载
  aisDbDir: string; // 路径
}

/**
 * web 服务升级配置策略
 */
export interface UpgradeEnvOpt {
  port: number;
  host: string;
  isDev: boolean;
  firmwareTGZ: string;
  upgradeSh: string;
  upgradeRunSh: string;
  upgradeLogDir: string;
}

/**
 * Redis
 */
export interface RedisEnvOpt {
  isDev: boolean;
  redisUrl: string;
  aisChannel: string;
  logChannel: string;
  updateChannel: string;
  appRpcRes: string;
  appRpcReq: string;
  redisChannel: string;
}

export const getAppEnv = (): AppEnvOpt => {
  const port = Number(process.env.API_PORT) || 5001;
  const host = String(process.env.API_HOST) || "127.0.0.1";
  // 是否https
  const https = process.env.APP_HTTPS === "true";
  // 是否加密
  const encrypt = process.env.APP_X_ENCRYPTED === "true";
  // body size limit
  const bodyLimitSize = parseInt(process.env.APP_BODY_LIMIT || "10", 10);
  return {
    isDev,
    port,
    host,
    https,
    encrypt,
    bodyLimitSize,
  };
};

export const getRedisEnv = (): RedisEnvOpt => {
  const ENV = process.env;
  return {
    isDev,
    redisUrl: ENV.APP_REDIS_URL || "redis://127.0.0.1:6379",
    aisChannel: ENV.APP_AIS_CHANNEL, // 主控服务-redis-推送ais
    logChannel: ENV.APP_LOG_CHANNEL, // 主控服务-redis-推送log(运行日志)
    updateChannel: ENV.APP_UPDATE_CHANNEL, // 主控服务-redis-推送更新数据
    appRpcRes: ENV.APP_RPC_RES, // 中间通信： storage服务/主控服务-redis-web
    appRpcReq: ENV.APP_RPC_REQ, // 中间通信： web-redis-主控服务
    redisChannel: "rpc.cfg.req", //自定义： 中间通信： web-redis-storage(启用存储)
  };
};

/**
 * 获取存储策略
 * retentionDays 最大保留的天数
 * minFreeRatio 空间保留百分阈值，低于此阈值会自动删除旧的数据库文件
 * maxRetries 尝试将ais 日志写入sd卡时如果报错，最大尝试次数
 * @returns
 */
export const getStroageEnv = (): StorageEnvOpt => {
  const RETENTION_DAYS = parseInt(process.env.APP_RETENTION_DAYS || "365", 10);
  const MIN_FREE_RATIO = 0.2; // <20 % 空间时强制删除
  const MAX_RETRIES = 10; // 最大尝试写入次数
  return {
    retentionDays: RETENTION_DAYS,
    minFreeRatio: MIN_FREE_RATIO,
    maxRetries: MAX_RETRIES,
  };
};

/**
 * 获取存储策略
 * dev ： ais 存储设置的路径基于用户设置的 APP_AIS_DB_PATH
 * prod : 不读取APP_AIS_DB_PATH， 存储位置先判断sd卡是否挂载，没有挂载路径为空，
 *                               挂载则默认存放在:sd根目录/node-service/ais/
 * @returns
 */
export const getStroageDbEnv = async (): Promise<StorageDbEnvOpt> => {
  let aisDbDir: string = "";
  let mountedState = false;
  if (isDev || isWindows) {
    aisDbDir = path.join(process.env.APP_AIS_DB_PATH, "ais");
    mountedState = true;
  } else {
    const SD_PATH = process.env.APP_SD_PATH; // sd卡路径
    // 判断sd 卡是否挂载
    const state = await diskUtil.getDiskStatus(SD_PATH);
    mountedState = state.mountStatus;
    if (mountedState) {
      //  如果挂载sd 卡，指定ais日志存储路径
      aisDbDir = path.join(SD_PATH, "node-service", "ais");
    }
  }
  if (!(await fs.pathExists(aisDbDir))) {
    await fs.ensureDir(aisDbDir);
  }
  return {
    mountedState,
    aisDbDir: aisDbDir,
  };
};

/**
 * 获取升级服务配置策略
 */
export const getUpgradeEnv = (): UpgradeEnvOpt => {
  const port = Number(process.env.API_PORT) || 5001;
  const host = String(process.env.API_HOST) || "127.0.0.1";
  // 临时存放的升级固件
  const TMEP_TAR_GZ =
    process.env.APP_UPGRADE_TARGET_PATH ?? "/tmp/upgrade.tar.gz";
  // 应用根目录
  const buildPath = process.env.APP_BUILD_PATH;
  const upgradePath = path.join(buildPath, "upgrade");
  // 升级脚本路径
  const UPGRADE_SH = path.join(upgradePath, "upgrade.sh");
  const UPGRADE_RUN_SH = path.join(upgradePath, "upgrade-run.sh");
  let upgradeSh, upgradeRunSh;
  if (fs.pathExistsSync(UPGRADE_SH)) {
    upgradeSh = UPGRADE_SH;
  }
  if (fs.pathExistsSync(UPGRADE_RUN_SH)) {
    upgradeRunSh = UPGRADE_RUN_SH;
  }
  const envLogPath = process.env.APP_LOG_PATH; // 系统应用（fastify） 日志文件路径
  const UPGRADE_LOG_DIR = path.join(envLogPath, "upgrade");
  return {
    port,
    host,
    isDev,
    firmwareTGZ: TMEP_TAR_GZ,
    upgradeSh,
    upgradeRunSh,
    upgradeLogDir: UPGRADE_LOG_DIR,
  };
};

/**
 * 前端静态资源
 * @returns
 */
export const getWwwPath = (): string => {
  return path.join(curDir, "www");
};

/**
 * 获取应用运行日志路径
 * @returns
 */
export const getLogFilePath = (): string => {
  const envLogPath = process.env.APP_LOG_PATH; // 系统应用（fastify） 日志文件路径
  const envLogFileName = process.env.APP_LOG_FILE_NAME || "maritime"; // 日志文件前缀
  const time = utils.getOnedayTimeName(); // yyyyMMDD
  const logFileName = `${envLogFileName}_${time}.log`;
  const logDir = envLogPath
    ? path.resolve(envLogPath)
    : path.join(curDir, "logs");
  fs.ensureDirSync(logDir);
  // 设置日志文件
  const logFile = path.join(logDir, logFileName);
  fs.ensureFileSync(logFile);
  return logFile;
};

/**
 * 获取系统db目录
 * 1.envDir 必须同时满足以下条件
 *  是绝对路径（path.isAbsolute）
 * 2.默认存放在：build/data/dbName.db
 * @returns
 */
export const getDbFilePath = (): string => {
  let baseDir: string;
  const envDbName = process.env.APP_DATABASE_FILE_NAME; // 数据库名称
  const envDbDir = process.env.APP_DB_PATH; // 系统应用数据库路径（绝对）
  let dbName = envDbName;
  if (!envDbName) {
    dbName = isDev ? "design-viewer-dev" : "design-viewer";
  }
  if (envDbDir && path.isAbsolute(envDbDir)) {
    baseDir = envDbDir;
  } else {
    // 否则回退到默认目录：<cwd>/data
    baseDir = path.join(curDir, "data");
  }
  const dbPath = path.join(baseDir, `${dbName}.db`);
  return dbPath;
};

/**
 * @description 获取用户上传目录
 * 1.envDir 必须同时满足以下条件：
 * - 存在且非空；
 * - 是绝对路径（path.isAbsolute）；
 * - 在文件系统中确实是已存在的目录；
 * 2.不满足时，permanet=false 为临时目录，临时目录就把目录设为 process.cwd()/uploads/temp；
 *    permanet=true 时是永久目录，永久目录设为 process.cwd()/uploads
 * 3.最后再拼 category，并用 fs.mkdirSync(..., { recursive: true }) 确保目录存在。
 *
 * @param category
 * @returns
 */
export const getUploadDir = (
  category: IUploadsInfoType,
  permanet = false
): string => {
  let baseDir: string;
  // 如果配置了 APP_UPLOAD_DIR 且是绝对路径并且目录存在，就用它
  const envUploadDir = process.env.APP_UPLOAD_DIR; // 上传文件路径（绝对）
  const suff = permanet === false ? "temp" : "";
  if (
    envUploadDir &&
    path.isAbsolute(envUploadDir) &&
    fs.existsSync(envUploadDir) &&
    fs.statSync(envUploadDir).isDirectory()
  ) {
    baseDir = path.join(envUploadDir, suff);
  } else {
    // 否则回退到默认临时目录：<cwd>/uploads/temp
    baseDir = path.join(curDir, "uploads", suff);
  }
  // 最终目录再加上业务 category
  const targetDir = path.join(baseDir, category);
  // 确保目录存在
  fs.ensureDirSync(targetDir);
  // if (!fs.existsSync(targetDir)) {
  //   fs.mkdirSync(targetDir, { recursive: true });
  // }
  return targetDir;
};
