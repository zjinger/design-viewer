import { FastifyInstance } from "fastify";
import userRouter from "./user.router";
import aisRouter from "./ais.router";
import deviceRouter from "./device.router";
import authRouter from "./auth.router";
import networkRouter from "./network.router";
import logRouter from "./log.router";
import confRouter from "./configuration.router";
import simulateRouter from "./simulate.router";
import upgradeRouter from "./upgrade.router";
import flowRouter from "./flow.router";
import installLogRouter from "./install-log.router";
import uploadRouter from "./upload.router";
const prefix = "/api/v1";
function routing(server: FastifyInstance) {
  // 认证
  server.register(authRouter, { prefix: "/api/v1/auth" });
  // 用户管理
  server.register(userRouter, { prefix: "/api/v1/users" });
  // AIS 数据
  server.register(aisRouter, { prefix: "/api/v1/ais" });
  // 设备管理
  server.register(deviceRouter, { prefix: "/api/v1/device" });
  // 网络配置（网络参数、ntp、转发传输、本地转发服务）
  server.register(networkRouter, { prefix: "/api/v1/network" });
  // 流控策略
  server.register(flowRouter, { prefix: "/api/v1/flow" });
  // 配置管理： 导入导出配置
  server.register(confRouter, { prefix: `${prefix}/configuration` });
  // 日志管理
  server.register(logRouter, { prefix: "/api/v1/log" });
  // 安装日志
  server.register(installLogRouter, { prefix: "/api/v1/install" });
  // 升级
  server.register(upgradeRouter, { prefix: "/api/v1/upgrade" });
  // 文件上传管理
  server.register(uploadRouter, { prefix: "/api/v1/content" });
  // ais 日志模拟 TODO:remove
  server.register(simulateRouter, { prefix: "/api/v1/simulate" });
}

export default routing;
