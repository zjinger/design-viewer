import { AuthControllerImpl } from "@/controllers";
import { loginAuthRouteOpts } from "@/schemas";
import { AppFastifyInstance } from "@/types/fastify-instance";

/**
 * @description 认证路由, 包含登录和登出
 * @author ZhangJing
 * @date 2025-03-12 11:03
 * @param {FastifyInstance} fastify
 */
async function authRouter(fastify: AppFastifyInstance) {
  const authController = new AuthControllerImpl(fastify);
  fastify.post("/login", loginAuthRouteOpts, authController.login);
  fastify.get(
    "/account",
    fastify.authPreHandlers.requireUser,
    authController.getAccount
  );
  fastify.get(
    "/logout",
    fastify.authPreHandlers.authentication,
    authController.logout
  );
}

export default authRouter;
