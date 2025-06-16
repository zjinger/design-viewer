import { RPC } from "@/constants/rpc";
import { FlowControllerImpl } from "@/controllers/flow.controller";
import {
  SubFlowControlCfgSchema,
  SubFlowControlCfg,
  FlowControlCfgSchema,
} from "@/schemas";
import { AppFastifyInstance } from "@/types/fastify-instance";
async function flowRouter(fastify: AppFastifyInstance) {
  const controller = new FlowControllerImpl(fastify);
  fastify.get(
    `/${RPC.GET_FLOW_CONTROL_CFG}`,
    fastify.authPreHandlers.requireUser,
    controller.getCfg<SubFlowControlCfg>
  );
  fastify.post(
    `/${RPC.SET_FLOW_CONTROL_CFG}`,
    {
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
      schema: { body: SubFlowControlCfgSchema },
    },
    controller.setCfg<SubFlowControlCfg>
  );
  // 流控策略保存
  fastify.post(
    `/save`,
    {
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
      schema: { body: FlowControlCfgSchema },
    },
    controller.save
  );
  // 流控详情
  fastify.get(
    `/getInfo`,
    fastify.authPreHandlers.requireUser,
    controller.getInfo
  );

  // 下载模板
  fastify.get(
    "/downloadTplFile",
    fastify.authPreHandlers.requireUser,
    controller.downloadTplFile
  );

  // 上传文件
  fastify.post(
    "/uploadTplFile",
    fastify.authPreHandlers.requireUser,
    controller.uploadTplFile
  );
}

export default flowRouter;
