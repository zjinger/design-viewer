import { baseIdRouteOpts, IBaseDto, IBaseSearchDto } from "./Base";
import { RouteShorthandOptions } from "fastify";
/**
 * 用户信息表 (tbl_userinfo)
 */
export interface IUserInfoDto extends IBaseDto {
  username: string;
  password: string;
  role: "super_admin" | "admin";
  remark?: string;
  pwdChangedAt?: number;
}
/**
 * 用户信息表搜索 DTO
 */
export interface IUserInfoSearchDto extends IBaseSearchDto {
  username?: string;
  role?: string;
}
/**
 * 用户信息 Joi 校验 Schema
 */
// export const userInfoSchema = Joi.object({
//   username: Joi.string().max(50).required(),
//   password: Joi.string().min(8).required(),
//   role: Joi.string().valid("admin", "super_admin").default("admin"),
// });
// 用户信息保存路由参数
export const userInfoSaveRouteOpts: RouteShorthandOptions = {
  schema: {
    body: {
      type: "object",
      required: ["username", "password"],
      properties: {
        username: { type: "string", maxLength: 50 },
        password: { type: "string", minLength: 8 },
      },
    },
  },
  // config: {
  //   description: "用户信息保存",
  // },
  // preHandler: [checkValidUser, checkSuperAdmin],
};
export const userResetPwdRouteOpts: RouteShorthandOptions = {
  schema: {
    body: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
      },
    },
  },
};
export const userUpdateRouteOpts: RouteShorthandOptions = {
  schema: {
    body: {
      type: "object",
      required: ["username", "id"],
      properties: {
        username: { type: "string" },
        id: { type: "string" },
      },
    },
  },
};

export const userUpdatePwdRouteOpts: RouteShorthandOptions = {
  schema: {
    body: {
      type: "object",
      required: ["id", "newPwd", "oldPwd"],
      properties: {
        id: { type: "string" },
        newPwd: { type: "string" },
        oldPwd: { type: "string" },
      },
    },
  },
};

// 用户信息列表路由参数
export const userGetListRouteOpts: RouteShorthandOptions = {
  // preHandler: [checkValidUser, checkSuperAdmin],
};

// 用户信息 id 路由参数
export const userInfoIdRouteOpts: RouteShorthandOptions = {
  ...baseIdRouteOpts,
  // preHandler: [checkValidUser],
  // config: {
  //   description: "用户信息 id",
  // },
};
