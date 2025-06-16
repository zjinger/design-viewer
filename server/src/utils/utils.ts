import { FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import os from "os";
import { randomBytes, pbkdf2Sync, timingSafeEqual } from "crypto";
const iterations = 100000;
const keyLength = 64;
const digest = "sha512";
export const utils = {
  isJSON: (data: string) => {
    try {
      JSON.parse(data);
    } catch (e) {
      return false;
    }
    return true;
  },

  base64ToStr: (base64Str: string): string => {
    return Buffer.from(base64Str, "base64").toString("utf-8");
  },

  /**
   * 订阅redis base64 字符串转为 json 对象，
   * @param base64Str
   * @returns
   */
  base64ToObj: <T = any>(base64Str: string): T => {
    return <T>JSON.parse(Buffer.from(base64Str, "base64").toString("utf-8"));
  },
  /**
   * 字符串base64编码
   * @param str
   * @returns
   */
  strToBase64: (str: string): string => {
    return Buffer.from(str, "utf-8").toString("base64");
  },

  /**
   * 对象转为base64 字符串，通过redis 发布
   * @param data
   * @returns
   */
  objToBase64: <T = any>(data: T): string => {
    return Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
  },

  getPlatform: () => {
    const platform = os.platform();
    switch (platform) {
      case "win32":
        return "windows";
      case "darwin":
        return "mac";
      case "linux":
        return "linux";
      default:
        return platform;
    }
  },
  getClientInfo: (
    request: FastifyRequest
  ): {
    ip: string;
    forwardedFor: string | string[] | undefined;
    userAgent: string | undefined;
  } => {
    return {
      ip: request.ip,
      forwardedFor: request.headers["x-forwarded-for"], // 代理情况
      userAgent: request.headers["user-agent"],
    };
  },

  genUUID: (): string => {
    return uuidv4().replace(/-/g, "");
  },

  // getCurrentTime: (utcMs?: number): string => {
  //   const now = utcMs ? new Date(utcMs) : new Date();
  //   const pad = (n: number) => n.toString().padStart(2, "0");
  //   return (
  //     `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
  //     `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  //   );
  // },
  /**
   * 返回格式类似 "2000-02-10 16:44:01"，并且确保这是“北京时间”。
   * 参数 utcMs 必须是一个 JavaScript 的 UTC 毫秒，否则默认用当前时间。
   */
  getCurrentTime: (utcMs?: number): string => {
    const raw = utcMs != null ? utcMs : Date.now();
    // 同样加 8 小时偏移
    const beijingMs = raw + 8 * 60 * 60 * 1000;
    const d = new Date(beijingMs);

    const pad = (n: number) => n.toString().padStart(2, "0");
    // 用 getUTC* 拿到“北京时区”的年月日时分秒
    const year = d.getUTCFullYear();
    const month = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hour = pad(d.getUTCHours());
    const minute = pad(d.getUTCMinutes());
    const second = pad(d.getUTCSeconds());

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },

  /**
   * 返回格式类似 "2000-02-10 16:44:01"，并且确保这是“UTC时间”。
   * 参数 utcMs 必须是一个 JavaScript 的 UTC 毫秒，否则默认用当前时间。
   */
  getCurrentUTCTime: (utcMs?: number): string => {
    const d = utcMs != null ? new Date(utcMs) : new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = d.getUTCFullYear();
    const month = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hour = pad(d.getUTCHours());
    const minute = pad(d.getUTCMinutes());
    const second = pad(d.getUTCSeconds());
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },

  /**
   * 返回格式类似 "2000-02-10_16:44:01.345"，并且确保这是“北京时间”。
   * 参数 utc 必须是一个 JavaScript 的 UTC 毫秒（Date.now() 等）；
   * 本方法会把它当作标准 UTC 时间，然后加上 8 小时偏移，再用 getUTCXXX() 来读取字段，
   * 从而获得北京时区对应的年月日时分秒、毫秒。
   */
  getProtocolTime: (utc?: number): string => {
    // 1. 如果没传 utc，就用当前时刻
    const raw = utc != null ? utc : Date.now();
    // 2. 把这个 UTC 毫秒值 + 8 小时(8 * 60 * 60 * 1000)
    const beijingMs = raw + 8 * 60 * 60 * 1000;
    const d = new Date(beijingMs);
    // 3. 偏移了毫秒，用 d.getUTC...() 就能得到北京时区的年月日时分秒
    const pad2 = (n: number) => n.toString().padStart(2, "0");
    const pad3 = (n: number) => n.toString().padStart(3, "0");
    const year = d.getUTCFullYear();
    const month = pad2(d.getUTCMonth() + 1);
    const day = pad2(d.getUTCDate());
    const hour = pad2(d.getUTCHours());
    const minute = pad2(d.getUTCMinutes());
    const second = pad2(d.getUTCSeconds());
    const msec = pad3(d.getUTCMilliseconds());

    return `${year}-${month}-${day}_${hour}:${minute}:${second}.${msec}`;
  },

  getUTC: (): string => {
    return new Date().toISOString();
  },

  getTimeName: () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  },

  getOnedayTimeName: () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}`;
  },

  getTime: (): number => {
    return new Date().getTime();
  },

  // 生成 hash（带 salt）
  genSalt: async (_: number, value: string): Promise<string> => {
    const salt = randomBytes(_).toString("hex");
    const derivedKey = pbkdf2Sync(
      value,
      salt,
      iterations,
      keyLength,
      digest
    ).toString("hex");
    return `${salt}$${derivedKey}`; // 用 $ 拼接 salt 和 hash
  },

  // 校验 hash
  compareHash: async (storedHash: string, value: string): Promise<boolean> => {
    const [salt, originalHash] = storedHash.split("$");
    const derivedKey = pbkdf2Sync(
      value,
      salt,
      iterations,
      keyLength,
      digest
    ).toString("hex");
    return timingSafeEqual(
      Buffer.from(originalHash, "hex"),
      Buffer.from(derivedKey, "hex")
    );
  },

  healthCheck: async (): Promise<void> => {
    try {
      // TODO: Add health check for database,use sqlite for now
      // await prisma.$queryRaw`SELECT 1`;
      return Promise.resolve();
    } catch (e) {
      throw new Error(`Health check failed: ${e.message}`);
    }
  },

  getTokenFromHeader: (
    authorizationHeader: string | undefined
  ): string | null => {
    if (!authorizationHeader) return null;
    const token = authorizationHeader.replace("Bearer ", "");
    return token || null;
  },

  // verifyToken: (token: string): any => {
  //   try {
  //     return JWT.verify(token, process.env.APP_JWT_SECRET as string);
  //   } catch (err) {
  //     return null;
  //   }
  // },

  // validateSchema: (schema: Joi.ObjectSchema) => {
  //   return (data: any) => {
  //     const { error } = schema.validate(data);
  //     if (error) {
  //       throw new Error(error.details[0].message);
  //     }
  //   };
  // },

  // preValidation: (schema: Joi.ObjectSchema) => {
  //   return (
  //     request: FastifyRequest,
  //     reply: FastifyReply,
  //     done: (err?: Error) => void
  //   ) => {
  //     const { error } = schema.validate(request.body);
  //     if (error) {
  //       return done(error);
  //     }
  //     done();
  //   };
  // },
};
