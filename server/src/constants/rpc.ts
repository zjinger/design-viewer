// Remote Procedure Call
export enum RPC {
  // 系统基本信息
  GET_SYS_INFO = "getSysInfo", // 2.2.1 获取系统基本信息

  // AIS 转发配置
  GET_AIS_CFG = "getAisCfg", // 2.2.2 获取 AIS 转发配置
  SET_AIS_CFG = "setAisCfg", // 2.2.3 设置 AIS 转发配置

  // 转发传输配置
  GET_TRANSMIT_CFG = "getTransmitCfg", // 2.2.4 获取转发传输配置
  SET_TRANSMIT_CFG = "setTransmitCfg", // 2.2.5 设置转发传输配置

  // 流控策略
  GET_FLOW_CONTROL_CFG = "getFlowControlCfg", // 2.2.6 获取流控策略
  SET_FLOW_CONTROL_CFG = "setFlowControlCfg", // 2.2.7 设置流控策略

  // 网络参数
  GET_NET_CFG = "getNetCfg", // 2.2.8 获取网络参数
  SET_NET_CFG = "setNetCfg", // 2.2.9 设置网络参数

  // 本地转发服务配置
  GET_LOCAL_CFG = "getLocalCfg", // 2.2.10 获取本地转发服务配置
  SET_LOCAL_CFG = "setLocalCfg", // 2.2.12 设置本地转发服务配置

  // NTP 服务配置
  GET_NTP_CFG = "getNtpCfg", // 2.2.13 获取 NTP 服务配置
  SET_NTP_CFG = "setNtpCfg", // 2.2.14 设置 NTP 服务配置

  // 配置文件路径
  GET_CFG_FILE_NAME = "getCfgFileName", // 2.2.15 获取配置文件路径
  SET_CFG_FILE_NAME = "setCfgFileName", // 2.2.16 设置配置文件路径

  // 管理网络参数
  GET_MGR_NET_CFG = "getMgrNetCfg", // 2.2.17 获取管理网络参数
  SET_MGR_NET_CFG = "setMgrNetCfg", // 2.2.18 设置管理网络参数
}
