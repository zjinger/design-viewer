import { baseIdRouteOpts, IBaseDto } from "./Base";
import { RouteShorthandOptions } from "fastify";
/**
 * 运行日志表 (tbl_loginfo)
 */
export interface ILogInfoDto extends IBaseDto {
  id: string; // ID
  eventType: string; // 事件类型
  logType: string; // 日志类型
  userId: string; // 用户ID
  username: string; // 用户名
  hostName?: string; // 主机名
  sourceIp?: string; // 源IP
  destinationIp?: string; // 目标IP
  operationDesc: string; // 操作描述
  browserName?: string; // 浏览器名称
  status: number; // 状态
  errorMsg?: string; // 错误信息
  durationMs: number; // 持续时间
}

export interface ILogInfoSearchDto {
  startTime: string;
  endTime: string;
  endTimeMs: number;
  startTimeMs: number;
  currentPage: number;
  pageRecord: number;
  eventType?: number; // 0 主控服务 1 日常事件
  order?: "asc" | "desc"; // 默认是desc 降序
}
/**
 * redis 订阅运行日志
 */
export interface SubLogMsg {
  utc: number; // utc整数，utc毫秒
  ts: string; // 字符串，对应的北京时间
  tip: string; // 字符串，提示文本
  content: string; //字符串，日志内容的base64 编码
}

/**
 * 提示警告
 */
export interface AlertLog {
  message: string;
}

/**
 * ws pong log
 */
export interface PongLog {
  message: string;
}

/**
 * 运行日志表搜索 DTO
 */
export const logSearchRouteOpts: RouteShorthandOptions = {
  schema: {
    body: {
      type: "object",
      properties: {
        startTime: { type: "string", format: "date-time" },
        endTime: { type: "string", format: "date-time" },
      },
    },
  },
  // preValidation: utils.preValidation(
  //   Joi.object({
  //     startTime: Joi.string().isoDate().required(),
  //     endTime: Joi.string().isoDate().required(),
  //   })
  // ),
};

export const logInfoIdRouteOpts: RouteShorthandOptions = {
  ...baseIdRouteOpts,
  // config: {
  //   description: "log id endpoint",
  // },
};
