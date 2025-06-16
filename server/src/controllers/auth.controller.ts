import { ERRORS } from "@/helpers/errors.helper";
import { IUserInfoDto, IUserLoginDto } from "@/schemas";
import { utils } from "@/utils/utils";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { BaseControllerImpl } from "./base.controller";
import { LOG_EVENT_TYPE } from "@/constants/log";

export class AuthControllerImpl extends BaseControllerImpl {
  constructor(fatify: FastifyInstance) {
    super(fatify);
  }
  login = async (
    request: FastifyRequest<{
      Body: IUserLoginDto;
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { username, password, type } = request.body;
      const db = this.db;
      const role = type === "super" ? "super_admin" : "admin";
      this.log.info({ role, user: username });
      const user = db
        .prepare(
          "SELECT id, username, password,role FROM TBL_USERINFO WHERE username = ? AND role = ?"
        )
        .get(username, role) as IUserLoginDto;
      if (!user) {
        const msg = `用户 ${username} 登录失败，用户不存在或角色不匹配`;
        this.log.error(msg);
        return this.handleError(reply, ERRORS.userCredError);
      }
      const checkPass = await utils.compareHash(user.password, password);
      if (!checkPass) {
        const msg = `用户 ${username} 登录失败，密码错误, 用户ID: ${user.id}`;
        this.log.error(msg);
        return this.handleError(reply, ERRORS.userCredError);
      }
      const accessToken = this.jwt.sign({
        id: user.id,
        username: user.username,
        role: user.role,
        pwdChangedAt: user.pwdChangedAt, // 毫秒时间戳
      });
      delete user.password;
      this.log.info(`用户 ${username} 已登录系统`);
      this.logger.info(
        request,
        LOG_EVENT_TYPE.LOGIN,
        `用户 ${username} 已登录系统`,
        user.role === "super_admin" ? 2 : 1
      );
      return this.handleSuccess(reply, { accessToken });
    } catch (err) {
      return this.handleError(reply, ERRORS.userLoginError, err);
    }
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as IUserInfoDto;
    this.logger.info(
      request,
      LOG_EVENT_TYPE.LOGOUT,
      `用户 ${user?.username} 已退出登录`,
      user.role === "super_admin" ? 2 : 1
    );
    return this.handleSuccess(reply, { message: "退出成功" });
  };

  getAccount = async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user as IUserInfoDto;
    if (!authUser) {
      return this.handleError(reply, ERRORS.invalidToken);
    }
    // 查询用户信息，获取用户权限信息
    const user = <IUserInfoDto>(
      this.db
        .prepare("SELECT id, username, role FROM TBL_USERINFO WHERE id = ?")
        .get(authUser.id)
    );
    if (!user) {
      return this.handleError(reply, ERRORS.invalidToken);
    }
    return this.handleSuccess(reply, {
      id: user.id,
      username: user.username,
    });
  };
}
