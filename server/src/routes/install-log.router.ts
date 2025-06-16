import { InstallLogControllerImpl } from "@/controllers/install-log.controller";
import { AppFastifyInstance } from "@/types/fastify-instance";

async function installLogRouter(fastify: AppFastifyInstance) {
  const logController = new InstallLogControllerImpl(fastify);
  fastify.post(
    "/getList",
    fastify.authPreHandlers.requireUser,
    logController.getList
  );
  fastify.post(
    "/save",
    fastify.authPreHandlers.requireUser,
    logController.save
  );

  fastify.get(
    "/delete/:id",
    fastify.authPreHandlers.requireUser,
    logController.delete
  );
  fastify.get(
    "/getInfo/:id",
    fastify.authPreHandlers.requireUser,
    logController.getInfo
  );

  fastify.post(
    "/upload",
    fastify.authPreHandlers.requireUser,
    logController.upload
  );
  fastify.get(
    "/preview/:id",
    fastify.authPreHandlers.requireUser,
    logController.preview
  );
}

export default installLogRouter;
