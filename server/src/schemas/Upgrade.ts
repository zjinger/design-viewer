import { IBaseDto } from "./Base";
/**
 * 固件升级表 (tbl_upgrade)
 */
export interface IUpgradeDto extends IBaseDto {
  id: string;
  firmwareVer: string;
  upgradeStatus: number;
}

export interface UpgradeLog {
  status: string;
  message: string;
  progress: number | null;
}

// export const upgradeSchema = Joi.object({
//   id: Joi.string().uuid().required(),
//   firmwareVer: Joi.string().required(),
//   upgradeStatus: Joi.number().valid(0, 1).default(0),
//   ...baseSchema, // 继承基础字段
// });
