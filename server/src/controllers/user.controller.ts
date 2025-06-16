import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IUserLoginDto } from "../schemas/Auth";
import { utils } from "@/utils/utils";
import { IUserInfoDto, IUserInfoSearchDto } from "@/schemas";
import { AppError, ERRORS } from "@/helpers/errors.helper";
import { BaseControllerImpl, IBaseController } from "./base.controller";
import { LOG_EVENT_TYPE } from "@/constants/log";
/**
 * @description 用户控制器
 * @author ZhangJing
 * @date 2025-03-13 14:03
 * @export
 * @class UserControllerImpl
 * @implements {IBaseController<IUserInfoDto, IUserInfoSearchDto>}
 */
export class UserControllerImpl
  extends BaseControllerImpl
  implements IBaseController<IUserInfoDto, IUserInfoSearchDto>
{
  constructor(fastify: FastifyInstance) {
    super(fastify);
  }
  getInfo = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<FastifyReply> => {
    try {
      const { id } = request.params;
      const user = this.db
        .prepare("SELECT id, username,remark FROM TBL_USERINFO WHERE id = ?")
        .get(id);
      if (!user) {
        return this.handleError(reply, ERRORS.userNotExists);
      }
      return this.handleSuccess(reply, user);
    } catch (e) {
      return this.handleError(reply, new AppError("获取用户失败"), e);
    }
  };
  delete = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<FastifyReply> => {
    const { id } = request.params;
    const result = this.db
      .prepare("DELETE FROM TBL_USERINFO WHERE id = ?")
      .run(id);
    if (result.changes === 0) {
      return this.handleError(reply, ERRORS.userNotExists);
    }
    return this.handleSuccess(reply, { id });
  };
  getList = async (
    request: FastifyRequest<{ Body: IUserInfoSearchDto }>,
    reply: FastifyReply
  ): Promise<FastifyReply> => {
    // const { username, role, ifPage, currentPage, pageRecord } = request.body;
    const users = this.db
      .prepare("SELECT id, username,role,remark,sysCreated FROM TBL_USERINFO")
      .all();
    return this.handleSuccess(reply, users);
  };

  /**
   * 超管重置密码
   */
  resetPwd = async (
    request: FastifyRequest<{ Body: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.body;
      // 判断用户是否存在且未删除
      const existing = this.db
        .prepare("SELECT * FROM tbl_userinfo WHERE id = ? AND sysDeleted = 0")
        .get(id) as IUserInfoDto;

      if (!existing) {
        return this.handleError(reply, ERRORS.userNotExists);
      }
      const hashedPwd =
        existing.role === "super_admin"
          ? await utils.genSalt(10, "Sad@2o25")
          : await utils.genSalt(10, "Ad_@2025"); // 超管账号默认密码 // 普通用户默认密码
      // 更新密码
      this.db
        .prepare(
          `UPDATE TBL_USERINFO SET password = ?,pwdChangedAt = ?, sysUpdated = ? WHERE Id = ?`
        )
        .run(hashedPwd, Date.now(), utils.getCurrentTime(), existing.id);
      return this.handleSuccess(reply, id);
    } catch (e) {
      return this.handleError(reply, new AppError("密码重置失败"), e);
    }
  };

  updatePassword = async (
    request: FastifyRequest<{
      Body: { id: string; oldPwd: string; newPwd: string };
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> => {
    try {
      const { id, oldPwd, newPwd } = request.body;
      const user = this.db
        .prepare("SELECT * FROM tbl_userinfo WHERE id = ? AND sysDeleted = 0")
        .get(id) as IUserInfoDto;

      if (!user) {
        return this.handleError(reply, ERRORS.userNotExists);
      }
      const checkPass = await utils.compareHash(user.password, oldPwd);
      if (!checkPass) {
        return this.handleError(reply, new AppError("旧密码不匹配"));
      }

      const passwordHash = await utils.genSalt(10, newPwd);
      // 3. 更新数据库
      const now = utils.getCurrentTime();
      const stmt = this.db.prepare(`
        UPDATE tbl_userinfo
        SET password = ?,pwdChangedAt = ?, sysUpdated = ?
        WHERE id = ?
      `);
      const result = stmt.run(passwordHash, Date.now(), now, id);
      if (result.changes === 0) {
        return this.handleError(reply, ERRORS.userPwdUpdateError);
      }
      this.logger.info(
        request,
        LOG_EVENT_TYPE.PASSWORD_CHANGE,
        `用户${user.username}密码修改成功`
      );
      return this.handleSuccess(reply, {});
    } catch (err) {
      return this.handleError(reply, ERRORS.internalServerError, err);
    }
  };

  updateUser = async (
    request: FastifyRequest<{ Body: IUserInfoDto }>,
    reply: FastifyReply
  ): Promise<FastifyReply> => {
    try {
      const { id, username, remark } = request.body;
      // 判断用户是否存在且未删除
      const existing = this.db
        .prepare("SELECT * FROM tbl_userinfo WHERE id = ? AND sysDeleted = 0")
        .get(id);

      if (!existing) {
        return this.handleError(reply, ERRORS.userNotExists);
      }
      // 更新用户名和更新时间
      const stmt = this.db.prepare(`
        UPDATE tbl_userinfo
        SET username = ?,remark=?, sysUpdated = ?
        WHERE id = ?
      `);
      const result = stmt.run(
        username,
        remark || "",
        utils.getCurrentTime(),
        id
      );
      if (result.changes === 0) {
        return this.handleError(reply, ERRORS.userSaveError);
      }
      return this.handleSuccess(reply, id);
    } catch (err) {
      return this.handleError(reply, ERRORS.internalServerError, err);
    }
  };

  /**
   * 新增用户
   * @param request
   * @param reply
   * @returns
   */
  save = async (
    request: FastifyRequest<{ Body: IUserInfoDto }>,
    reply: FastifyReply
  ): Promise<FastifyReply> => {
    try {
      const { username, password } = request.body;
      const user = this.db
        .prepare(
          "SELECT id, username, password FROM TBL_USERINFO WHERE username = ?"
        )
        .get(username) as IUserLoginDto;
      if (user) {
        return this.handleError(reply, ERRORS.userExists);
      }
      const hashPass = await utils.genSalt(10, password);
      const id = utils.genUUID();
      this.db
        .prepare(
          "INSERT INTO TBL_USERINFO (id,username, password) VALUES (?, ?,?)"
        )
        .run(id, username, String(hashPass));
      return this.handleSuccess(reply, { userId: id });
    } catch (err) {
      return this.handleError(reply, ERRORS.userSaveError, err);
    }
  };
}
