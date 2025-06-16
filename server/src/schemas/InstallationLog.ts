import { IBaseDto, IBaseSearchDto } from "./Base";
import { IUploadsInfoDto } from "./Uploads";

export interface IInstallationLogSearchDto extends IBaseSearchDto {
  operator?: string;
  deviceName?: string;
  startTime?: string;
  endTime?: string;
  order?: "asc" | "desc"; // 默认是desc 降序
}
export interface IInstallationLogDto extends IBaseDto {
  /** 主键 UUID，由后端/数据库生成 */
  id: string;
  /** 设备编号/名称 */
  deviceName: string;
  /** 安装日期，格式 YYYY-MM-DD */
  installDate: string;
  /** 运维人员 */
  operator: string;
  /** 备注/安装说明 */
  remark?: string;
  /** 上传附件 */
  uploadList?: IUploadsInfoDto[];
}
export const InstallationLogSchema = {
  type: "object",
  required: ["deviceName", "installDate", "operator"],
  additionalProperties: false,
  properties: {
    deviceName: { type: "string", minLength: 1 },
    installDate: { type: "string", minLength: 1 },
    operator: { type: "string", minLength: 1 },
    remark: { type: "string" },
  },
} as const;
