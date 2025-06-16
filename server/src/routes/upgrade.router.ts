import { UpgradeControllerImpl } from "@/controllers/upgrade.controller";
import { AppFastifyInstance } from "@/types/fastify-instance";

async function upgradeRouter(fastify: AppFastifyInstance) {
  const controller = new UpgradeControllerImpl(fastify);
  fastify.post(
    "/upload/:type",
    fastify.authPreHandlers.requireUser,
    controller.upgrade
  );
  // web 服务升级
  fastify.get(
    "/web/:id",
    fastify.authPreHandlers.requireUser,
    controller.handleWebUpgrade
  );

  fastify.get(
    "/main/:id",
    fastify.authPreHandlers.requireUser,
    controller.handleMainUpgrade
  );
}

export default upgradeRouter;
