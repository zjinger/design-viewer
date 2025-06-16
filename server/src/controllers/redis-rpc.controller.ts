import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { BaseControllerImpl } from "./base.controller";
import { AppError, ERRORS } from "@/helpers/errors.helper";
import { isEmpty } from "@/utils/validator";
import { PubRequestBody } from "@/schemas";
/**
 * @description 基于重载终端内部协议：通用获取和设置方法
 * @author ZhangJing
 * @date 2025-04-21 17:04
 * @export
 * @class RedisRpcController
 * @extends {BaseControllerImpl}
 */
export class RedisRpcController extends BaseControllerImpl {
  /**
   * @description 请求后缀
   *
   * 根据船载终端内部协议中交互数据的定义，获取设置是get,设置配置是set
   *
   * eg: 获取ais 转发配置，method 是getAisCfg
   * 设置 ais 转发配置，method 是setAisCfg，这里的suffixKey 设置位 AisCfg
   * @author ZhangJing
   * @date 2025-04-21 17:04
   * @private
   * @type {string}
   * @memberof RedisRpcController
   */
  private methodSuffix: string = "";

  constructor(fastify: FastifyInstance, methodSuffix?: string) {
    super(fastify);
    if (methodSuffix) {
      this.methodSuffix = methodSuffix;
    }
  }

  rpcGet = async <S>(method: string, reply: FastifyReply) => {
    return this.rpc<{}, S>(method, reply);
  };

  rpcSet = async <T>(method: string, reply: FastifyReply, param: T) => {
    return this.rpc<T, {}>(method, reply, param);
  };

  private rpc = async <T, S>(
    method: string,
    reply: FastifyReply,
    param?: T
  ): Promise<S> => {
    if (isEmpty(method)) {
      return this.handleError(reply, new AppError(`${method} Not Found`, 404));
    }
    // const tip = method.indexOf("get") > -1 ? "获取" : "设置";
    try {
      const requestParams: PubRequestBody<T> = {
        method,
        param: param || ({} as T),
      };
      const result = await this.redisRpc<T, S>(requestParams, {
        timeout: 10 * 1000,
      });
      return result;
    } catch (e) {
      return this.handleError(
        reply,
        // new AppError(`[RPC] ${tip}${method}失败`),
        ERRORS.rpcError,
        e
      );
    }
  };

  getCfg = async <S>(
    request: FastifyRequest,
    reply: FastifyReply,
    customMethod?: string
  ) => {
    const method = customMethod
      ? customMethod
      : this.methodSuffix
      ? `get${this.methodSuffix}`
      : "";
    const cfg = await this.rpcGet<S>(method, reply);
    return this.handleSuccess(reply, cfg);
  };

  setCfg = async <T>(
    request: FastifyRequest<{ Body: T }>,
    reply: FastifyReply,
    customMethod?: string
  ) => {
    const method = customMethod
      ? customMethod
      : this.methodSuffix
      ? `set${this.methodSuffix}`
      : "";
    const cfg = <T>request.body;
    const result = await this.rpcSet<T>(method, reply, cfg);
    return this.handleSuccess(reply, result);
  };
}
