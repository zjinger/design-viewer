import { AisControllerImpl } from "@/controllers";
import { AppFastifyInstance } from "@/types/fastify-instance";
import { AisCfgSchema, SubAisCfg } from "@/schemas";
async function aisRouter(fastify: AppFastifyInstance) {
  const controller = new AisControllerImpl(fastify);
  fastify.get(
    "/getAisCfg",
    fastify.authPreHandlers.requireUser,
    controller.getCfg
  );
  fastify.post(
    "/setAisCfg",
    {
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
      schema: { body: AisCfgSchema },
    },
    controller.setCfg<SubAisCfg>
  );
  fastify.post(
    "/getList",
    fastify.authPreHandlers.requireUser,
    controller.getList
  );

  fastify.get(
    "/getEarliestTime",
    fastify.authPreHandlers.requireUser,
    controller.getEarliestTime
  );

  fastify.post(
    "/downloadCsv",
    fastify.authPreHandlers.requireUser,
    controller.downloadCsv
  );
}

export default aisRouter;
