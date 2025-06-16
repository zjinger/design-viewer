import { FastifyInstance } from "fastify";
import { RedisRpcController } from "./redis-rpc.controller";

/**
 * @description 网络配置
 * @author ZhangJing
 * @date 2025-04-14 11:04
 * @export
 * @class NetworkControllerImpl
 * @extends {RedisRpcController}
 */
export class NetworkControllerImpl extends RedisRpcController {
  constructor(fastify: FastifyInstance) {
    super(fastify, "NetCfg");
  }
}
