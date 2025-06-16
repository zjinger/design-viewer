import { AppError } from "@/helpers/errors.helper";
import { handleSuccess, handleError } from "@/helpers/response.helper";
import { RpcOptions, PubRequestBody } from "@/schemas/SubPub";
import { LoggerService } from "@/services/log.service";
import { JWT } from "@fastify/jwt";
import { Database } from "better-sqlite3";
import {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";

export interface IBaseController<T, S> {
  save(
    request: FastifyRequest<{ Body: T }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
  getList(
    request: FastifyRequest<{ Body: S }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;

  delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;

  getInfo(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
}

export class BaseControllerImpl {
  fastify: FastifyInstance;
  db: Database;
  log: FastifyBaseLogger;
  logger: LoggerService;
  jwt: JWT;
  redisRpc: <T, S>(
    requestParams: PubRequestBody<T>,
    opt?: RpcOptions
  ) => Promise<S>;
  handleSuccess: <T>(
    reply: FastifyReply,
    datas: T,
    info?: string
  ) => FastifyReply;
  handleError: (
    reply: FastifyReply,
    error: AppError,
    errDetail?: any
  ) => FastifyReply;
  constructor(fastify: FastifyInstance) {
    this.handleError = handleError;
    this.handleSuccess = handleSuccess;
    this.fastify = fastify;
    this.log = fastify.log;
    // @ts-ignore
    this.db = fastify.betterSqlite3;
    // @ts-ignore
    this.logger = fastify.logger;
    this.jwt = fastify.jwt;
    // @ts-ignore
    this.redisRpc = fastify.redisRpc;
  }

  updateCached = () => {
    // @ts-ignore
    return this.fastify.updateCached;
  };
}
