import { AppFastifyInstance } from "@/types/fastify-instance";
import {
  simulateAISMessages,
  simulateLOGMessages,
} from "../services/simulator.service";
import { isNumber } from "@/utils/validator";
import { AppError } from "@/helpers/errors.helper";
import { handleError, handleSuccess } from "@/helpers/response.helper";

/**
 * 数据模拟
 * @param fastify
 */
async function simulateRouter(fastify: AppFastifyInstance) {
  fastify.post("/ais", async (request, reply) => {
    const channel = process.env.APP_AIS_CHANNEL;
    try {
      let { count, delay } = request.body as any;
      if (!isNumber(count) || count < 0) {
        count = 10;
      }
      if (!isNumber(delay) || delay < 0) {
        count = 200;
      }
      await simulateAISMessages(fastify.redis, channel, count, delay);
      return handleSuccess(reply, {}, "模拟AIS数据发布完成");
    } catch (err) {
      fastify.log.error(err);
      return handleError(reply, new AppError("模拟发布失败", 500));
    }
  });

  fastify.post("/log", async (request, reply) => {
    const channel = process.env.APP_LOG_CHANNEL;
    try {
      let { count, delay } = request.body as any;
      if (!isNumber(count) || count < 0) {
        count = 10;
      }
      if (!isNumber(delay) || delay < 0) {
        count = 200;
      }
      await simulateLOGMessages(fastify.redis, channel, count, delay);
      return handleSuccess(reply, {}, "模拟LOG数据发布完成");
    } catch (err) {
      fastify.log.error(err);
      return handleError(reply, new AppError("模拟发布失败", 500));
    }
  });
}

export default simulateRouter;
