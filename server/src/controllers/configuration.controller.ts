import { FastifyInstance, FastifyRequest } from "fastify";
import { saveFile } from "@/helpers/upload.helper";
import { ERRORS } from "@/helpers/errors.helper";
import { LOG_EVENT_TYPE } from "@/constants/log";
import fs from "fs-extra";
import path from "path";
import { utils } from "@/utils/utils";
import { RedisRpcController } from "./redis-rpc.controller";
import {
  HybridCfg,
  SubAisCfg,
  SubConfControl,
  SubMgrNetCfg,
  SuperHybridCfg,
} from "@/schemas";
import { RPC } from "@/constants/rpc";
import { getRedisEnv, RedisEnvOpt } from "@/utils/getEnvPath";

// 配置文件目录
async function getTempConfDir() {
  const cwd = process.cwd();
  const confDir = path.join(cwd, "temp", "conf");
  await fs.ensureDir(confDir);
  return confDir;
}

/**
 *
 * @description 配置文件
 * @author ZhangJing
 * @date 2025-03-13 14:03
 * @export
 * @class DeviceControllerImpl
 */
export class ConfigurationControllerImpl extends RedisRpcController {
  redisEnvOpt: RedisEnvOpt;
  constructor(fastify: FastifyInstance) {
    super(fastify);
    this.redisEnvOpt = getRedisEnv();
  }
  importConf = async (req, reply) => {
    try {
      const model = await saveFile(req, "config", this.db);
      // 通过rpc通知主服务
      await this.setCfgFileName(model.filePath, reply);
      this.log.info(
        req,
        LOG_EVENT_TYPE.CONFIG_IMPORT,
        `导入配置文件成功： ${model.id}_${model.fileName}`
      );
      this.logger.info(req, LOG_EVENT_TYPE.CONFIG_IMPORT, "导入配置文件成功");
      return this.handleSuccess(reply, { id: model.id });
    } catch (e) {
      return this.handleError(reply, ERRORS.confImportError, e);
    }
  };

  exportConf = async (req, reply) => {
    try {
      const confPath = await this.getCfgFileName(reply);
      const ext = path.extname(confPath);
      const name = path.basename(confPath, ext);
      const timestamp = utils.getTimeName();
      const filename = `${name}_${timestamp}${ext}`;
      reply.header(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      //  reply.header("Content-Type", "application/octet-stream");
      reply.type("application/octet-stream");
      const stream = fs.createReadStream(confPath);
      stream.on("error", (err) => {
        return this.handleError(reply, ERRORS.confExportReadError, err);
      });
      this.logger.info(req, LOG_EVENT_TYPE.CONFIG_EXPORT, "导出配置文件成功");
      return reply.send(stream);
    } catch (e) {
      return this.handleError(reply, ERRORS.confExportError, e);
    }
  };

  /**
   * 正式环境配置文件路径
   */
  getCfgFileName = async (reply) => {
    const f = await this.rpcGet<{ file: string }>("getCfgFileName", reply);
    return f.file;
  };

  /**
   * 正式环境上传配置文件路径
   */
  setCfgFileName = async (file: string, reply) => {
    return await this.rpcSet<{ file: string }>("setCfgFileName", reply, {
      file,
    });
  };
  /**
   * 重置
   */
  resetConf = async (request, reply) => {
    try {
      // 还原指令
      const result = await this.rpcSet<SubConfControl>("control", reply, {
        cmd: 1,
        arg1: 0,
        arg2: "",
      });
      // 还原AIS日志存储： 默认存储 tbl_vesselinfo 表中 ifAisLogEnabled 设置为1
      // 查询 vesselinfo 表
      const stmt = this.db.prepare(
        `SELECT * FROM tbl_vesselinfo WHERE sysDeleted = 0 LIMIT 1`
      );
      let cached = stmt.get() as { ifAisLogEnabled: number };
      const cachedIfAisLogEnabled = cached.ifAisLogEnabled === 1;
      let updateAisLog = {};
      // 如果当前ais 日志存储没开启，需要开启，并通知存储服务
      if (!cachedIfAisLogEnabled) {
        updateAisLog = this.db
          .prepare(
            "UPDATE tbl_vesselinfo SET IfAisLogEnabled = 1 WHERE SysDeleted = 0"
          )
          .run();
        // 通知存储服务启用AIS 日志存储
        await this.redisRpc(
          {
            method: "switchAisLogEnabled",
            param: { ifAisLogEnabled: true },
          },
          { timeout: 10000, channel: this.redisEnvOpt.redisChannel }
        );
      }

      // 流控策略，1 清空mmsi 列表 (tbl_matching_mmsi) 2 清空标绘 (tbl_matching_area )
      const clearMmsi = this.db
        .prepare("DELETE FROM tbl_matching_mmsi WHERE 1=1")
        .run();
      const clearArea = this.db
        .prepare("DELETE FROM tbl_matching_area WHERE 1=1")
        .run();
      this.log.info("恢复出厂设置成功");
      this.logger.info(
        request,
        LOG_EVENT_TYPE.FACTORY_RESET,
        "恢复出厂设置成功"
      );
      return this.handleSuccess(reply, {
        result,
        updateAisLog,
        clearMmsi,
        clearArea,
      });
    } catch (e) {
      return this.handleError(reply, ERRORS.resetConfError, e);
    }
  };

  /**
   * 检查是否支持远程升级
   * @param request
   * @param reply
   * @returns
   */
  checkUpgrade = async (request: FastifyRequest, reply) => {
    try {
      // 查询 vesselinfo 表
      const stmt = this.db.prepare(
        `SELECT ifRemoteUpgrade FROM tbl_vesselinfo WHERE sysDeleted = 0 LIMIT 1`
      );
      const vessel = stmt.get() as { ifRemoteUpgrade: number };
      const result = {
        ifRemoteUpgrade: Boolean(vessel.ifRemoteUpgrade),
      };
      return this.handleSuccess(reply, result);
    } catch (e) {
      return this.handleError(reply, ERRORS.getUpgradeStatus, e);
    }
  };

  /**
   * 获取综合配置
   *
   */
  getSuperConf = async (request: FastifyRequest, reply) => {
    try {
      const current = await this.rpcGet<SubMgrNetCfg>(
        RPC.GET_MGR_NET_CFG,
        reply
      );
      // 查询 vesselinfo 表
      const stmt = this.db.prepare(
        `SELECT ifRemoteUpgrade FROM tbl_vesselinfo WHERE sysDeleted = 0 LIMIT 1`
      );
      const vessel = stmt.get() as { ifRemoteUpgrade: number };
      const result: SuperHybridCfg = {
        ...current,
        ifRemoteUpgrade: Boolean(vessel.ifRemoteUpgrade),
      };
      return this.handleSuccess(reply, result);
    } catch (e) {
      return this.handleError(reply, ERRORS.getHybridConfError, e);
    }
  };
  /**
   * 获取综合配置
   */
  getHybridConf = async (request: FastifyRequest, reply) => {
    try {
      const current = await this.rpcGet<SubAisCfg>(RPC.GET_AIS_CFG, reply);
      // 查询 vesselinfo 表
      const stmt = this.db.prepare(
        `SELECT * FROM tbl_vesselinfo WHERE sysDeleted = 0 LIMIT 1`
      );
      const vessel = stmt.get() as { ifAisLogEnabled: number };
      const result: HybridCfg = {
        name: current.name,
        mmsi: current.mmsi,
        tag_block: current.tag_block,
        talkerIdEnabled: current.talker_id_replace?.enable === true,
        from: current.talker_id_replace?.from || "",
        to: current.talker_id_replace?.to || "",
        ifAisLogEnabled: Boolean(vessel.ifAisLogEnabled),
      };

      return this.handleSuccess(reply, result);
    } catch (e) {
      return this.handleError(reply, ERRORS.getHybridConfError, e);
    }
  };

  /**
   * 综合配置
   */
  setHybridConf = async (
    request: FastifyRequest<{ Body: HybridCfg }>,
    reply
  ) => {
    try {
      const hdCfg = request.body;
      const { name, tag_block, talkerIdEnabled, to, ifAisLogEnabled, mmsi } =
        hdCfg;
      const current = await this.rpcGet<SubAisCfg>(RPC.GET_AIS_CFG, reply);
      const merged: SubAisCfg = {
        ...current,
        name,
        mmsi,
        tag_block,
        talker_id_replace: {
          ...current.talker_id_replace,
          enable: talkerIdEnabled === true,
          to,
        },
      };
      // 查询 vesselinfo 表
      const stmt = this.db.prepare(
        `SELECT * FROM tbl_vesselinfo WHERE sysDeleted = 0 LIMIT 1`
      );
      let cached = stmt.get() as { ifAisLogEnabled: number };
      const cachedIfAisLogEnabled = cached.ifAisLogEnabled === 1;
      if (cachedIfAisLogEnabled != ifAisLogEnabled) {
        // 通知存储服务启用AIS 日志存储
        await this.redisRpc(
          {
            method: "switchAisLogEnabled",
            param: { ifAisLogEnabled },
          },
          { timeout: 10000, channel: this.redisEnvOpt.redisChannel }
        );
      }

      const result = await this.rpcSet<SubAisCfg>(
        RPC.SET_AIS_CFG,
        reply,
        merged
      );

      // 更新本地数据库
      const updateStmt = this.db.prepare(`
        UPDATE tbl_vesselinfo
        SET ifAisLogEnabled = @ifAisLogEnabled,
            sysUpdated = @sysUpdated
        WHERE sysDeleted = 0
      `);
      updateStmt.run({
        name,
        talkerId: to,
        tagBlock: tag_block ? 1 : 0,
        ifAisLogEnabled: ifAisLogEnabled ? 1 : 0,
        sysUpdated: utils.getCurrentTime(),
      });

      return this.handleSuccess(reply, result);
    } catch (e) {
      return this.handleError(reply, ERRORS.setHybridConfError, e);
    }
  };

  /**
   * 综合配置
   */
  setSuperConf = async (
    request: FastifyRequest<{ Body: SuperHybridCfg }>,
    reply
  ) => {
    try {
      const superHdCfg = request.body;
      const { ip, ip2, netmask, netmask2, ifRemoteUpgrade } = superHdCfg;
      const current = await this.rpcGet<SubMgrNetCfg>(
        RPC.GET_MGR_NET_CFG,
        reply
      );
      const merged: SubMgrNetCfg = {
        ...current,
        ip,
        ip2,
        netmask,
        netmask2,
      };
      const result = await this.rpcSet<SubMgrNetCfg>(
        RPC.SET_MGR_NET_CFG,
        reply,
        merged
      );
      // 更新本地数据库
      const updateStmt = this.db.prepare(`
        UPDATE tbl_vesselinfo
        SET ifRemoteUpgrade = @ifRemoteUpgrade,
            sysUpdated = @sysUpdated
        WHERE sysDeleted = 0
      `);
      updateStmt.run({
        ifRemoteUpgrade: ifRemoteUpgrade ? 1 : 0,
        sysUpdated: utils.getCurrentTime(),
      });
      return this.handleSuccess(reply, result);
    } catch (e) {
      return this.handleError(reply, ERRORS.setHybridConfError, e);
    }
  };
}
