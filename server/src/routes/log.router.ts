import { LogControllerImpl } from "@/controllers";
import { AppFastifyInstance } from "@/types/fastify-instance";

async function logRouter(fastify: AppFastifyInstance) {
  const logController = new LogControllerImpl(fastify);
  fastify.post(
    "/getList",
    fastify.authPreHandlers.requireUser,
    logController.getList
  );
  fastify.get(
    "/getEarliestTime",
    fastify.authPreHandlers.requireUser,
    logController.getEarliestTime
  );
  fastify.post(
    "/downloadCsv",
    fastify.authPreHandlers.requireUser,
    logController.downloadCsv
  );
}

export default logRouter;
