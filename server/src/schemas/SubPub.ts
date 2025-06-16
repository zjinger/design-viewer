import { WS_CHANNEL, WS_REQ_ACTION, WS_REQ_CHANNEL } from "@/constants/ws";

export interface RpcOptions {
  /** 超时 ms */
  timeout?: number;
  channel?: string;
}

/**
 * 交互数据，请求体
 *
 * json数据中不会出现null值，如有“空”值的语义，用其他数值代替，如空字符串或某些特定的整数值
 */
export interface PubRequestBody<T> {
  id?: number | string; // 指令流水号， 32位整数自增
  method: string; // 字符串，方法名
  param: T; // 参数对象，与method相关
}

/**
 * 交互数据，返回体
 *
 * 若存在错误(即error不为空)，则result为空对象
 */
export interface SubResponseBody<T> {
  id: number; // 整数，请求的指令流水号
  error: string; // 字符串，错误消息，若没有错误则为空字符串
  result: T; // 结果对象，与请求的method相关
}

/**
 * ws 请求体
 */
export interface WsRequestBody {
  channel: WS_REQ_CHANNEL; // 请求频道类型
  action?: WS_REQ_ACTION; // 请求动作
  payload?: any; // 待定
}

/**
 * ws 返回体
 */
export interface WsResponseBody<T> {
  channel: WS_CHANNEL;
  timestamp: string;
  action?: WS_REQ_ACTION; // 请求动作
  error?: string;
  payload?: T;
}
