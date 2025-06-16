import { IBaseDto, IBaseSearchDto } from "./Base";

export type IUploadsInfoType =
  | "config" // 配置文件
  | "firmware_main" // 主控服务
  | "firmware_web" // web服务
  | "flow_tpl" // 流控策略mmsi 模板excel文件，已设置解析后会删除文件
  | "install_log"; // 安装日志上传： pdf ，图片

/**
 * 用户信息表 (tbl_uploads)
 */
export interface IUploadsInfoDto extends IBaseDto {
  fileName: string;
  storedName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  category?: IUploadsInfoType;
  uploader?: string;
}
/**
 * 用户信息表搜索 DTO
 */
export interface IUploadsInfoSearchDto extends IBaseSearchDto {}
