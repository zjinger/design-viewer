import { RPC } from "@/constants/rpc";
import { NetworkControllerImpl } from "@/controllers/network.controller";
import {
  NetBusinessCfgSchema,
  NetLocalCfgSchema,
  NetMgrCfgSchema,
  NetTransmitCfgSchema,
  SubLocalCfg,
  SubMgrNetCfg,
  SubNetworkCfg,
  SubNtpCfg,
  SubTransmitCfg,
} from "@/schemas";
import { AppFastifyInstance } from "@/types/fastify-instance";
import { FastifyRequest } from "fastify";

async function networkRouter(fastify: AppFastifyInstance) {
  const controller = new NetworkControllerImpl(fastify);
  // 网络参数:业务网口 ===========================================
  fastify.get(
    `/${RPC.GET_NET_CFG}`,
    fastify.authPreHandlers.requireUser,
    controller.getCfg
  );
  fastify.post(
    `/${RPC.SET_NET_CFG}`,
    {
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
      schema: { body: NetBusinessCfgSchema },
    },
    controller.setCfg<SubNetworkCfg>
  );

  // 本地转发配置 ===========================================
  fastify.get(
    `/${RPC.GET_LOCAL_CFG}`,
    fastify.authPreHandlers.requireUser,
    (request, reply) => {
      return controller.getCfg<SubLocalCfg>(request, reply, RPC.GET_LOCAL_CFG);
    }
  );
  fastify.post(
    `/${RPC.SET_LOCAL_CFG}`,
    {
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
      schema: { body: NetLocalCfgSchema },
    },
    (request: FastifyRequest<{ Body: SubLocalCfg }>, reply) => {
      return controller.setCfg<SubLocalCfg>(request, reply, RPC.SET_LOCAL_CFG);
    }
  );

  // ntp 服务配置 ===========================================
  fastify.get(
    `/${RPC.GET_NTP_CFG}`,
    fastify.authPreHandlers.requireUser,
    (request, reply) => {
      return controller.getCfg<SubNtpCfg>(request, reply, RPC.GET_NTP_CFG);
    }
  );
  fastify.post(
    `/${RPC.SET_NTP_CFG}`,
    {
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
      // TODO: ntp 参数校验
      //   schema: { body:  },
    },
    (request: FastifyRequest<{ Body: SubNtpCfg }>, reply) => {
      return controller.setCfg<SubNtpCfg>(request, reply, RPC.SET_NTP_CFG);
    }
  );

  // 转发传输配置 ===========================================
  fastify.get(
    `/${RPC.GET_TRANSMIT_CFG}`,
    fastify.authPreHandlers.requireUser,
    (request, reply) => {
      return controller.getCfg<SubTransmitCfg>(
        request,
        reply,
        RPC.GET_TRANSMIT_CFG
      );
    }
  );
  fastify.post(
    `/${RPC.SET_TRANSMIT_CFG}`,
    {
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
      schema: { body: NetTransmitCfgSchema },
    },
    (request: FastifyRequest<{ Body: SubTransmitCfg }>, reply) => {
      return controller.setCfg<SubTransmitCfg>(
        request,
        reply,
        RPC.SET_TRANSMIT_CFG
      );
    }
  );

  // 管理网口参数 ===========================================
  fastify.get(
    "/getMgrNetCfg",
    fastify.authPreHandlers.requireUser,
    (request, reply) => {
      return controller.getCfg<SubMgrNetCfg>(request, reply, "getMgrNetCfg");
    }
  );
  fastify.post(
    "/setMgrNetCfg",
    {
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
      schema: { body: NetMgrCfgSchema },
    },
    (request: FastifyRequest<{ Body: SubMgrNetCfg }>, reply) => {
      return controller.setCfg<SubMgrNetCfg>(request, reply, "setMgrNetCfg");
    }
  );
}

export default networkRouter;
