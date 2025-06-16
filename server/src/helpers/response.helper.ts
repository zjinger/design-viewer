import { STANDARD } from "@/constants/request";
import { FastifyReply } from "fastify";
import { AppError, ERRORS } from "./errors.helper";

interface SuccessResponse<T> {
  rlt: 0;
  info: string;
  code: number;
  datas?: T;
}

interface ErrorResponse {
  rlt: 1;
  info: string;
  code: number;
}

export function handleSuccess<T>(
  reply: FastifyReply,
  datas: T,
  info?: string
): FastifyReply {
  const res: SuccessResponse<T> = {
    rlt: 0,
    code: STANDARD.OK.statusCode,
    info: info || STANDARD.OK.message,
    datas,
  };
  return reply.status(STANDARD.OK.statusCode).send(res);
}

export function handleError(
  reply: FastifyReply,
  error: AppError = ERRORS.internalServerError,
  errDetail?: Error
) {
  if (errDetail) {
    reply.log.error(errDetail, error.message);
  }
  const res: ErrorResponse = {
    rlt: 1,
    code: error.statusCode,
    info: error.message,
  };
  return reply.status(error.statusCode).send(res);
}
