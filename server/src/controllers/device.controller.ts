import os from "os";
import { execSync } from "child_process";
import { FastifyInstance } from "fastify";
import { SubAisCfg, SubSysInfo } from "@/schemas";
const isWindows = os.platform() === "win32";
import path from "path";
import fs from "fs";
import { diskUtil } from "@/utils/disk";
import { RedisRpcController } from "./redis-rpc.controller";
import { utils } from "@/utils/utils";
import { latlngUtil } from "@/utils/latlng";
import { ERRORS } from "@/helpers/errors.helper";
import { RPC } from "@/constants/rpc";
let cachedWebVersion: string | null = null;
/**
 * 获取web服务版本号
 * 从package.json中读取
 * @returns
 */
const getWebVersion = () => {
  if (cachedWebVersion !== null) {
    return cachedWebVersion;
  }
  try {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    cachedWebVersion = packageJson.version || "unknown";
    return cachedWebVersion;
  } catch (error) {
    cachedWebVersion = null;
    throw new Error(error);
  }
};

/**
 * 外部存储(SD卡)状态
 * 1、总容量
 * 2、已用容量
 * 3、剩余时间
 * 4、挂载状态
 */
const getSDCardStatus = async () => {
  const basePath = process.env.APP_SD_PATH;
  const disk = await diskUtil.getDiskStatus(basePath);
  // 单位换算函数
  const toGB = (bytes: number): number => {
    return Number((bytes / 1024 ** 3).toFixed(2));
  };
  const usedPercent =
    disk.total > 0 ? Number(((disk.used / disk.total) * 100).toFixed(2)) : 0;
  return {
    usedPercent,
    total: toGB(disk.total), // 总容量
    used: toGB(disk.used), // 已经使用
    available: toGB(disk.available), // 可用
    mountStatus: disk.mountStatus ? 1 : 0, // 已挂载
  };
};

/**
 * 获取磁盘使用情况
 * @returns
 */
const getDiskUsage = () => {
  const output = execSync("df -h / | tail -1").toString().split(/\s+/);
  // 如果是windows系统，且配置了git bin,查看的是C盘的使用情况
  if (isWindows) {
    return {
      total: output[2],
      used: output[3],
      available: output[4],
      usage: output[5],
    };
  }
  return {
    total: output[1],
    used: output[2],
    available: output[3],
    usage: output[4],
  };
};

/**
 *
 * @description 设备控制器
 * @author ZhangJing
 * @date 2025-03-13 14:03
 * @export
 * @class DeviceControllerImpl
 */
export class DeviceControllerImpl extends RedisRpcController {
  constructor(fastify: FastifyInstance) {
    super(fastify);
  }

  /**
   * 船舶数据
   */
  private getVesselInfo = () => {
    const cached = this.updateCached();
    if (cached && cached.own_vessel) {
      const vessel = cached.own_vessel;
      const { lat, lng, utc } = vessel; // 此处返回的utc 是秒
      const latStr = latlngUtil.formatDMS(lat, true);
      const lngStr = latlngUtil.formatDMS(lng, false);
      const utcMs = utc * 1000;
      return {
        position: `${latStr} ${lngStr}`, // 实时位置
        lastUpdateTime: utils.getCurrentTime(utcMs), // 最后更新时间
        lastUpdateTimeUtcMs: utcMs,
      };
    }
    return {
      position: "", // 实时位置
      lastUpdateTime: "", // 最后更新时间
      lastUpdateTimeUtcMs: 0,
    };
  };

  /**
   * 系统当前时间、每秒更新
   */
  getSysTime = async (request, reply) => {
    const time = utils.getCurrentTime();
    return this.handleSuccess(reply, { ts: time, ms: Date.now() });
  };

  /**
   * GNSS 状态
   * 1、可见卫星数
   * 2、已使用卫星数
   * 3、GNSS时间
   * 4、定位经纬度
   */
  getGNSSInfo = async (request, reply) => {};

  getDeviceInfo = async (request, reply) => {
    try {
      const sysInfo = await this.rpcGet<SubSysInfo>(RPC.GET_SYS_INFO, reply);
      const aisInfo = await this.rpcGet<SubAisCfg>(RPC.GET_AIS_CFG, reply);
      const { position, lastUpdateTime, lastUpdateTimeUtcMs } =
        this.getVesselInfo();
      const data = {
        sysInfo, // 单片机各版本号，序列号等信息
        shipInfo: {
          position,
          lastUpdateTime,
          lastUpdateTimeUtcMs,
          shipName: aisInfo.name,
          mmsi: aisInfo.mmsi,
        },
        webVersion: getWebVersion(), // web服务版本号
        sdCard: await getSDCardStatus(), // SD卡使用情况
        systemTime: utils.getCurrentTime(), // 系统时间
        systemUtcMs: Date.now(), // 系统utc时间毫秒数
      };
      return this.handleSuccess(reply, data);
    } catch (err) {
      return this.handleError(reply, ERRORS.deviceInfoError, err);
    }
  };
}
