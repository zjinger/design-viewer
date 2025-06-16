export enum LOG_EVENT_TYPE {
  // 用户操作相关
  LOGIN = "账号登录",
  LOGOUT = "账号登出",
  PASSWORD_CHANGE = "密码修改", // 密码修改

  // 系统操作
  SYSTEM_START = "系统启动", // 系统启动
  SYSTEM_REBOOT = "系统重启", // 系统重启
  FIRMWARE_UPDATE = "服务升级", // 固件升级
  FACTORY_RESET = "恢复默认", // 恢复默认设置
  CONFIG_IMPORT = "配置导入",
  CONFIG_EXPORT = "配置导出",
  FLOW_TPL_UPLOAD = "模板上传",

  // redis 相关
  // REDIS_CONNECT_ERROR = "redis_connect_error", // redis 连接失败
  // REDIS_RPC_ERROR = "redis_rpc_error", // 基于内部通信协议交互错误

  // 数据库操作
  DB_BASEDATA_INSERT_ERROR = "db_basedata_insert_error", // 数据库基础数据插入失败

  // 日志管理
  LOG_RUNNING = "主控服务", // 主控服务运行日志
  LOG_EXPORT = "日志下载", // 日志导出
  LOG_STORAGE = "AIS存储", // 存储模块日志
}

export enum LOG_LEVEL {
  DEBUG = "debug", // 调试信息
  INFO = "info", // 重要运行信息
  WARN = "warn", // 警告信息
  ERROR = "error", // 错误信息
  FATAL = "fatal", // 致命错误，可能导致系统崩溃
}
