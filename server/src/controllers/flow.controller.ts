import { saveFile, saveFileToDb, UploadFile } from "@/helpers/upload.helper";
import { RedisRpcController } from "./redis-rpc.controller";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  FlowControlCfg,
  FlowMatchingArea,
  FlowMatchingMmsi,
  IUploadsInfoType,
  SubFlowControlCfg,
} from "@/schemas";
import path from "path";
import fs from "fs-extra";
import { AppError, ERRORS } from "@/helpers/errors.helper";
import * as XLSX from "xlsx";
import { utils } from "@/utils/utils";
import { RPC } from "@/constants/rpc";
import { isEmpty } from "@/utils/validator";
import { LOG_EVENT_TYPE } from "@/constants/log";

export class FlowControllerImpl extends RedisRpcController {
  constructor(fastify: FastifyInstance) {
    super(fastify, "FlowControlCfg");
  }

  private uploadType: IUploadsInfoType = "flow_tpl";

  getInfo = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      // 获取当前配置
      const cfg = await this.rpcGet<SubFlowControlCfg>(
        RPC.GET_FLOW_CONTROL_CFG,
        reply
      );
      const areaList = await this._getAreaList();
      const mmsiList = await this._getMmsiList();
      const result: FlowControlCfg = {
        trigger_min: cfg.trigger_min,
        trigger_count: cfg.trigger_count,
        timeout_min: cfg.timeout_min,
        rule1Enable: cfg.rule1.enable,
        rule2Enable: cfg.rule2.enable,
        rule2Prefix: cfg.rule2.prefix,
        rule1: mmsiList,
        rule2: areaList,
      };
      return this.handleSuccess(reply, result);
    } catch (e) {
      return this.handleError(reply, new AppError("获取流控策略失败"), e);
    }
  };

  /**
   * 保存流控策略
   */
  save = async (
    req: FastifyRequest<{
      Body: FlowControlCfg;
    }>,
    reply: FastifyReply
  ) => {
    const {
      trigger_min,
      trigger_count,
      timeout_min,
      rule1Enable,
      rule2Enable,
      rule1,
      rule2,
      rule2Prefix,
    } = req.body;
    try {
      // 获取当前配置
      const cfg = await this.rpcGet<SubFlowControlCfg>(
        RPC.GET_FLOW_CONTROL_CFG,
        reply
      );
      const base_mmsi = rule1.map((ele) => ele.mmsi);
      const areas = rule2.map((ele) => ({ wkt: ele.wkt, r: ele.radius || 0 }));
      const merged: SubFlowControlCfg = {
        ...cfg,
        trigger_min,
        trigger_count,
        timeout_min,
        rule1: {
          enable: rule1Enable,
          base_mmsi,
        },
        rule2: {
          enable: rule2Enable,
          prefix: rule2Prefix,
          areas,
        },
      };
      await this.rpcSet<SubFlowControlCfg>(
        RPC.SET_FLOW_CONTROL_CFG,
        reply,
        merged
      );
      // 保存匹配列表
      await this._saveMmsiList(rule1);
      // 保存特定范围列表
      await this._saveAreaList(rule2);
      return this.handleSuccess(reply, {});
    } catch (e) {
      return this.handleError(reply, new AppError("保存失败"), e);
    }
  };

  downloadTplFile = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const curDir = process.cwd(); // 当前目录
      const tplFilePath = path.join(curDir, "templates", "tpl.xlsx"); // 默认数据库路径
      if (!fs.existsSync(tplFilePath)) {
        return this.handleError(reply, ERRORS.fileNotFound);
      }
      const ext = path.extname(tplFilePath);
      const filename = `岸基MMSI导入模板${ext}`;
      reply.header(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      reply.header("Content-Type", "application/octet-stream");
      const stream = fs.createReadStream(tplFilePath);
      stream.on("error", (err) => {
        this.fastify.log.error(`下载模板时读取文件失败: ${err?.message}`);
        return this.handleError(reply, ERRORS.flowTplReadError, err);
      });
      return reply.send(stream);
    } catch (e) {
      return this.handleError(reply, ERRORS.flowTplDownloadError, e);
    }
  };

  /**
   * excel 解析器
   */
  private excelTplResolver = (filePath: string) => {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // 默认取第一个sheet
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // 以二维数组形式解析
      // this.log.info(jsonData, "解析后的数据");
      const logs: string[] = [];
      if (jsonData.length < 3) {
        throw new AppError("上传的模板内容为空或格式不正确");
      }
      // 读取表头，确认第一列叫“MMSI”
      const headers = jsonData[1] as string[];
      // this.log.info(headers, "头部");
      const mmsiIndex = headers.findIndex(
        (h) => h?.toString().trim().toUpperCase() === "岸基MMSI*"
      );
      const nameIndex = headers.findIndex(
        (h) => h?.toString().trim().toUpperCase() === "名称"
      );
      if (mmsiIndex === -1) {
        throw new AppError("上传的模板缺少'MMSI'列");
      }
      const mmsiList: FlowMatchingMmsi[] = [];
      for (let i = 3; i < jsonData.length; i++) {
        const row = jsonData[i];
        const mmsiRaw = row[mmsiIndex];
        if (isEmpty(mmsiRaw)) continue;
        // logs.push(`导入数据中第${i - 3 + 1}行MMSI为空，已跳过；`);
        const nameRaw = row[nameIndex] ?? "";
        const mmsi = String(mmsiRaw).trim();
        if (!/^[0-9]{1,9}$/.test(mmsi)) {
          logs.push(
            `导入数据中第${i - 3 + 1}行MMSI格式异常，已跳过：${mmsiRaw}；`
          );
        } else if (mmsiList.findIndex((ele) => ele.mmsi == mmsi) > -1) {
          logs.push(`导入数据中第${i - 3 + 1}行MMSI重复，已跳过：${mmsiRaw}；`);
        } else {
          mmsiList.push({
            mmsi: String(mmsiRaw).trim(),
            name: String(nameRaw).trim(),
          });
        }
      }
      if (mmsiList.length === 0) {
        throw new AppError("未提取到有效的MMSI数据");
      }
      // 打印结果
      // logs.push(`成功提取到${mmsiList.length}条MMSI`);
      return { mmsiList, logs };
    } catch (err) {
      throw new AppError(`解析模板文件失败: ${err?.message}`);
    }
  };

  uploadTplFile = async (request: FastifyRequest, reply: FastifyReply) => {
    let file: UploadFile;
    try {
      file = await saveFile(request, this.uploadType);
      const { logs, mmsiList } = this.excelTplResolver(file.filePath);
      // 解析成功，保存文件信息
      // @ts-ignore
      const user = request.user as IUserInfoDto;
      file.uploaderId = user.id;
      saveFileToDb(this.db, file);
      this.logger.info(
        request,
        LOG_EVENT_TYPE.FLOW_TPL_UPLOAD,
        "MMSI数据导入完成"
      );
      return this.handleSuccess(reply, {
        logs,
        mmsiList,
      });
    } catch (e) {
      if (e instanceof AppError) {
        return this.handleError(reply, e);
      }
      return this.handleError(reply, ERRORS.flowTplUploadError, e);
    } finally {
      // 移除无用文件
      if (file && file.filePath) {
        await fs.remove(file.filePath).catch(() => {});
      }
    }
  };

  private _getAreaList = async () => {
    const stmt = this.db.prepare(
      `SELECT id,name,shape,wkt,radius,remark,sysCreated,sysUpdated FROM tbl_matching_area WHERE sysDeleted = 0 ORDER BY sysCreated DESC`
    );
    return <FlowMatchingArea[]>stmt.all();
  };

  private _getMmsiList() {
    const stmt = this.db.prepare(
      `SELECT id,name,mmsi,sysCreated,sysUpdated FROM tbl_matching_mmsi WHERE sysDeleted = 0 ORDER BY sysCreated DESC`
    );
    const rows = <FlowMatchingMmsi[]>stmt.all();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      mmsi: r.mmsi,
    }));
  }

  // 批量保存范围
  private _saveAreaList = async (list: FlowMatchingArea[]) => {
    const db = this.db;
    const now = utils.getCurrentTime();
    const selectStmt = db.prepare(`
      SELECT id, name, shape, wkt, radius, remark FROM tbl_matching_area WHERE sysDeleted = 0
    `);
    const insertStmt = db.prepare(`
      INSERT INTO tbl_matching_area (id, name, shape, wkt, radius, remark, sysCreated, sysUpdated, sysDeleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);
    const updateStmt = db.prepare(`
      UPDATE tbl_matching_area
      SET name = ?, shape = ?, wkt = ?, radius = ?, remark = ?, sysUpdated = ?
      WHERE id = ?
    `);
    const deleteStmt = db.prepare(`
      UPDATE tbl_matching_area SET sysDeleted = 1, sysUpdated = ? WHERE id = ?
    `);
    const existing = <FlowMatchingArea[]>selectStmt.all();
    const existingMap = new Map<string, any>();
    for (const row of existing) {
      existingMap.set(row.id, row);
    }
    const inputIdSet = new Set<string>();
    const trx = db.transaction(() => {
      for (const item of list) {
        const id = item.id || utils.genUUID();
        inputIdSet.add(id);
        const existingRow = existingMap.get(id);

        if (!existingRow) {
          // 插入新记录
          insertStmt.run(
            id,
            item.name,
            item.shape,
            item.wkt,
            item.shape === "circle" ? item.radius ?? 0 : 0,
            item.remark ?? "",
            now,
            now
          );
        } else {
          // 比对字段是否有变化，有则更新
          const needUpdate =
            existingRow.name !== item.name ||
            existingRow.shape !== item.shape ||
            existingRow.wkt !== item.wkt ||
            (existingRow.radius ?? 0) !== (item.radius ?? 0) ||
            (existingRow.remark ?? "") !== (item.remark ?? "");

          if (needUpdate) {
            updateStmt.run(
              item.name,
              item.shape,
              item.wkt,
              item.shape === "circle" ? item.radius ?? 0 : 0,
              item.remark ?? "",
              now,
              id
            );
          }
        }
      }
      // 删除多余的记录
      for (const [id] of existingMap) {
        if (!inputIdSet.has(id)) {
          deleteStmt.run(now, id);
        }
      }
    });
    trx();
  };

  // 批量保存list
  private _saveMmsiList = async (list: FlowMatchingMmsi[]) => {
    try {
      const db = this.db;
      const now = utils.getCurrentTime();
      const incomingMmsiSet = new Set<string>(list.map((item) => item.mmsi));

      // 读出当前所有“未删除”行
      const existingRows = db
        .prepare(`SELECT id, mmsi FROM tbl_matching_mmsi WHERE sysDeleted = 0`)
        .all() as Array<{ id: string; mmsi: string }>;

      const deleteStmt = db.prepare(
        `UPDATE tbl_matching_mmsi
           SET sysDeleted = 1,
               sysUpdated = ?
         WHERE id = ?`
      );
      const insertStmt = db.prepare(
        `INSERT INTO tbl_matching_mmsi
           (id, name, mmsi, sysCreated, sysUpdated, sysDeleted)
         VALUES (?,  ?,    ?,    ?,          ?,          0)`
      );

      const trx = db.transaction(() => {
        // 1. 删除所有不在 incomingMmsiSet 里的行
        for (const row of existingRows) {
          if (!incomingMmsiSet.has(row.mmsi)) {
            deleteStmt.run(now, row.id);
          }
        }

        // 2. 新增 list 中而现有表里没有的 mmsi
        const existingMmsiSet = new Set<string>(
          existingRows.map((r) => r.mmsi)
        );
        for (const item of list) {
          if (!existingMmsiSet.has(item.mmsi)) {
            insertStmt.run(utils.genUUID(), item.name, item.mmsi, now, now);
          }
        }
      });

      trx();
    } catch (e) {
      throw e;
    }
  };
}
