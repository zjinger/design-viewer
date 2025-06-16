import { DeviceControllerImpl } from "@/controllers";
import { AppFastifyInstance } from "@/types/fastify-instance";
async function deviceRouter(fastify: AppFastifyInstance) {
  const controller = new DeviceControllerImpl(fastify);
  fastify.get(
    "/getDeviceInfo",
    fastify.authPreHandlers.requireUser,
    controller.getDeviceInfo
  );
  // 系统时间
  fastify.get(
    "/getSysTime",
    fastify.authPreHandlers.requireUser,
    controller.getSysTime
  );
}

export default deviceRouter;
