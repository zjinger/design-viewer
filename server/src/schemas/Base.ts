import { RouteShorthandOptions } from "fastify";

/**
 * 通用的基础字段接口
 */
export interface IBaseDto {
  id: string;
  sysCreated?: string;
  sysUpdated?: string;
  sysDeleted?: string;
}
export interface IBaseSearchDto {
  currentPage?: number;
  pageRecord?: number;
  ifPage?: boolean;
  keyword?: string;
}
/**
 *  通用的 Joi 校验 Schema
 */
// export const baseSchema = {
//   id: Joi.string().uuid().required(),
//   sysCreated: Joi.string().optional(),
//   sysUpdated: Joi.string().optional(),
//   sysDeleted: Joi.string().optional(),
// };

// export const baseSearchSchema = {
//   currentPage: Joi.number().optional(),
//   pageRecord: Joi.number().optional(),
//   ifPage: Joi.boolean().optional(),
//   keyword: Joi.string().optional(),
// };

export const baseIdRouteOpts: RouteShorthandOptions = {
  schema: {
    params: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
    },
  }
  // ,
  // preValidation: utils.validateSchema(
  //   Joi.object({ id: Joi.string().required() })
  // ),
};
