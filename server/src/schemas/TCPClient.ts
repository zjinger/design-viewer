import { IBaseDto } from "./Base";
/**
 * TCP 配置表 (tbl_tcpclient)
 */
export interface ITcpClient extends IBaseDto {
  id: string;
  vesselId: string;
  serverIp: string;
  serverPort: string;
  ifEnabled: number;
  ifEncryption: number;
}

// export const tcpClientSchema = Joi.object({
//   vesselId: Joi.string().uuid().required(),
//   serverIp: Joi.string().required(),
//   serverPort: Joi.string().required(),
//   ifEnabled: Joi.number().valid(0, 1).default(0),
//   ifEncryption: Joi.number().valid(0, 1).default(1),
//   ...baseSchema, // 继承基础字段
// });
