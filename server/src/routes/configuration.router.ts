import { ConfigurationControllerImpl } from "@/controllers/configuration.controller";
import { HybridCfgSchema, SuperHybridCfgSchema } from "@/schemas";
import { AppFastifyInstance } from "@/types/fastify-instance";
async function confRouter(fastify: AppFastifyInstance) {
  const controller = new ConfigurationControllerImpl(fastify);
  fastify.post(
    "/import",
    fastify.authPreHandlers.requireUser,
    controller.importConf
  );
  fastify.get(
    "/export",
    fastify.authPreHandlers.requireUser,
    controller.exportConf
  );

  fastify.get(
    "/resetConf",
    fastify.authPreHandlers.requireUser,
    controller.resetConf
  );

  /** 综合配置 */
  fastify.post(
    "/setHybridConf",
    {
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
      schema: { body: HybridCfgSchema },
    },
    controller.setHybridConf
  );

  /** 综合配置 */
  fastify.get(
    "/getHybridConf",
    fastify.authPreHandlers.requireUser,
    controller.getHybridConf
  );

  /** 超管配置 */
  fastify.post(
    "/setSuperConf",
    {
      preHandler: fastify.authPreHandlers.requireAdmin.preHandler,
      schema: { body: SuperHybridCfgSchema },
    },
    controller.setSuperConf
  );

  /** get超管配置 */
  fastify.get(
    "/getSuperConf",
    fastify.authPreHandlers.requireAdmin,
    controller.getSuperConf
  );

  /**是否支持远程升级 */
  fastify.get(
    "/checkUpgrade",
    fastify.authPreHandlers.requireUser,
    controller.checkUpgrade
  );
}

export default confRouter;
