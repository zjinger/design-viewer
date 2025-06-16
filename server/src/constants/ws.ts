/**
 * ais 推送的频道类型
 */
export enum WS_CHANNEL {
  AIS = "ais", // ais 报文推送
  LOG = "log", // 主控服务运行日志推送
  UPDATE = "update", // 终端状体更新推送
  UPGRADE = "upgrade", // 升级日志推送
  PONG = "pong", // 心跳检测
  ALERT = "alert",
}

/**
 * ws 接收的频道类型
 */
export enum WS_REQ_CHANNEL {
  PING = "ping",
  AIS_START = "ais_start",
  AIS_STOP = "ais_stop",
  CMD = "cmd",
}

/**
 * 请求的动作类型
 */
export enum WS_REQ_ACTION {
  REBOOT = "reboot", // 重启
  RESET = "reset", // 恢复出厂设置（重置）
}
