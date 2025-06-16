import { RouteShorthandOptions } from "fastify";

export interface IUserLoginDto {
  id?: string;
  username: string;
  password: string;
  type: "super" | "common";
  role?: string;
  pwdChangedAt?: number;
}

// export const loginSchema = Joi.object({
//   username: Joi.string().max(50).required(),
//   password: Joi.string().min(8).required(),
// });

/**
 * 登录路由参数
 */
export const loginAuthRouteOpts: RouteShorthandOptions = {
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
  // preValidation: utils.preValidation(loginSchema),
};
