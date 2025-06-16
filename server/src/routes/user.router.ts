import { UserControllerImpl } from "@/controllers";
import {
  userInfoIdRouteOpts,
  userResetPwdRouteOpts,
  userUpdatePwdRouteOpts,
  userUpdateRouteOpts,
} from "@/schemas";
import { AppFastifyInstance } from "@/types/fastify-instance";
async function userRouter(fastify: AppFastifyInstance) {
  // fastify.decorateRequest("authUser", null);
  const userController = new UserControllerImpl(fastify);
  // fastify.post("/save", userInfoSaveRouteOpts, userController.save);
  /** 更新用户信息 */
  fastify.post(
    "/updateUser",
    {
      schema: userUpdateRouteOpts.schema,
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
    },
    userController.updateUser
  );
  /** 用户列表 */
  fastify.post(
    "/getList",
    fastify.authPreHandlers.requireAdmin,
    userController.getList
  );
  // fastify.get("/delete/:id", userInfoIdRouteOpts, userController.delete);
  /** 重置密码 */
  fastify.post(
    "/resetPwd",
    {
      schema: userResetPwdRouteOpts.schema,
      preHandler: fastify.authPreHandlers.requireAdmin.preHandler,
    },
    userController.resetPwd
  );
  /** 更新密码 */
  fastify.post(
    "/updatePassword",
    {
      schema: userUpdatePwdRouteOpts.schema,
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
    },
    userController.updatePassword
  );
  fastify.get(
    "/getInfo/:id",
    {
      schema: userInfoIdRouteOpts.schema,
      preHandler: fastify.authPreHandlers.requireUser.preHandler,
    },
    userController.getInfo
  );
}
export default userRouter;
