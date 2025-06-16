import { IBaseDto } from "./Base";

/**
 * 船舶终端信息表 (tbl_vesselinfo)
 */
export interface IVesselInfoDto extends IBaseDto {
  id: string;
  name: string;
  typeCode?: string;
  softwareVer: string;
  hardwareVer: string;
  deviceIp: string;
  productId?: string;
  satcomGateway?: string;
  ifAisLogEnabled: number;
  ifForwardSaving: number;
  ifTcpServer: number;
  ifEncryption: number;
  dataFormat: number;
}

// export const vesselInfoSchema = Joi.object({
//   id: Joi.string().uuid().required(),
//   name: Joi.string().max(100).required(),
//   typeCode: Joi.string().max(10).optional(),
//   softwareVer: Joi.string().max(20).required(),
//   hardwareVer: Joi.string().max(20).required(),
//   deviceIp: Joi.string().max(100).required(),
//   productId: Joi.string().optional(),
//   satcomGateway: Joi.string().optional(),
//   ifAisLogEnabled: Joi.number().valid(0, 1).default(1),
//   ifForwardSaving: Joi.number().valid(0, 1).default(1),
//   ifTcpServer: Joi.number().valid(0, 1).default(1),
//   ifEncryption: Joi.number().valid(0, 1).default(1),
//   dataFormat: Joi.number().valid(0, 1).default(0),
//   ...baseSchema, // 继承基础字段
// });
