import { UploadControllerImpl } from "@/controllers/upload.controller";
import { AppFastifyInstance } from "@/types/fastify-instance";

async function uploadRouter(fastify: AppFastifyInstance) {
  const controller = new UploadControllerImpl(fastify);
  fastify.post(
    "/upload",
    fastify.authPreHandlers.requireUser,
    controller.upload
  );
  // web 服务升级
  fastify.get(
    "/remove/:id",
    fastify.authPreHandlers.requireUser,
    controller.remove
  );
}

export default uploadRouter;
