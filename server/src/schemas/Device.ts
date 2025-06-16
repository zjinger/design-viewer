import { IBaseDto } from "./Base";

export interface IDeviceDto extends IBaseDto {}

/**
 * redis 订阅数据
 */
export interface SubSysInfo {
  sn: string; //设备序列号
  verision: string; // 软件版本号
  build: string; // 编译时间
  fw_verision: string; // 固件版本
}
