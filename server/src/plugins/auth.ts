import fp from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { IUserInfoDto } from "@/schemas";
import { ERRORS } from "@/helpers/errors.helper";
import { handleError } from "@/helpers/response.helper";

// 注册权限中间件
export default fp(async (fastify: FastifyInstance) => {
  // 注册 JWT 插件
  fastify.register(fastifyJwt, {
    secret: process.env.APP_JWT_SECRET || "default_secret",
    sign: { expiresIn: "7d" },
    verify: { algorithms: ["HS256"] },
  });

  // 验证 token
  async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      return handleError(reply, ERRORS.unauthorizedAccess);
    }
  }

  // 验证用户是否存在
  async function isUser(request: FastifyRequest, reply: FastifyReply) {
    const payload = request.user as IUserInfoDto & {
      iat: number;
      pwdChangedAt: number;
    };
    if (!payload) {
      return handleError(reply, ERRORS.unauthorizedAccess);
    }

    try {
      // @ts-ignore: 添加插件后类型已在 typings.d.ts 扩展
      const db = fastify.betterSqlite3;
      const stmt = db.prepare("SELECT * FROM TBL_USERINFO WHERE id = ?");
      const row = stmt.get(payload.id) as IUserInfoDto;
      if (!row) {
        return handleError(reply, ERRORS.unauthorizedAccess);
      }
      const dbPwdChangedAt: number = row?.pwdChangedAt || 0;
      // Token 的签发时间早于最近一次密码变更时间，修改过密码需要重新登录
      if (payload.iat * 1000 < dbPwdChangedAt) {
        return handleError(reply, ERRORS.unauthorizedAccess);
      }
      // @ts-ignore
      request.user.role = row.role as string;
    } catch (err) {
      return handleError(reply, ERRORS.internalError, err);
    }
  }

  // 判断是否为超级管理员
  async function isAdmin(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as IUserInfoDto;
    if (user?.role !== "super_admin") {
      return handleError(reply, ERRORS.permissionDenied);
    }
  }

  // 装饰实例
  fastify.decorate("verifyJWT", verifyJWT);
  fastify.decorate("isUser", isUser);
  fastify.decorate("isAdmin", isAdmin);

  // 权限组合中间件
  fastify.decorate("authPreHandlers", {
    authentication: {
      preHandler: verifyJWT,
    },
    requireUser: {
      preHandler: [verifyJWT, isUser],
    },
    requireAdmin: {
      preHandler: [verifyJWT, isUser, isAdmin],
    },
  });
});
