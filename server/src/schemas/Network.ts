export interface NetworkRoute {
  dest: string; // 目的网络地址
  netmask: string; // 子网掩码
  gw: string; // 网关地址
}

/**
 * 网络参数
 */
export interface SubNetworkCfg {
  dhcp: boolean; // 是否启用dhcp功能，若启用，则ip,netmask,gateway无效
  ip: string; //本机ip地址
  netmask: string; //子网掩码
  gateway: string; //网关地址
  route: NetworkRoute[]; // 静态路由对象数组
}

/**
 * 转发传输配置:主机配置
 */
export interface TransmitHost {
  ip: string; // ip地址
  port: number; // 整数，端口号
  encrypt: boolean; // ais数据是否加密
  enable: boolean; // 本连接是否启用
}

/**
 * 转发传输配置
 */
export interface SubTransmitCfg {
  hosts: TransmitHost[]; // hosts对象数组，每个对象为一个连接配置
}

/**
 * 本地转发服务配置
 */
export interface SubLocalCfg {
  enable: boolean; // 是否启用本地转发服务
  port: number; //本地端口
  max_count: number; // 最大连接数量
  encrypt: boolean; //是否启用ais数据加密
}

/**
 * ntp 服务配置
 */
export interface SubNtpCfg {
  enable: boolean; // 是否启用ntp服务
  sync_hour: number; //整数， 校准间隔，单位：小时
  ntp1_url: string; // 主ntp服务地址
  ntp2_url: string; // 备用ntp服务地址
}

/**
 * 管理网口配置
 */
export interface SubMgrNetCfg {
  ip: string;
  ip2: string;
  netmask: string;
  netmask2: string;
}
/** 管理网口参数校验 */
export const NetMgrCfgSchema = {
  type: "object",
  required: ["ip", "netmask"],
  additionalProperties: false,
  properties: {
    ip: { type: "string", format: "ipv4" },
    ip2: { type: "string", format: "ipv4" },
    netmask: { type: "string", format: "ipv4" },
  },
};

/** 业务网口参数校验 */
export const NetBusinessCfgSchema = {
  type: "object",
  // DHPC 一定要有，routes 一定要有（可以是空数组）
  required: ["dhcp", "routes"],
  additionalProperties: false,

  properties: {
    dhcp: { type: "boolean" },
    // 当 dhcp 为 false 时，必须提供下面三项
    ip: { type: "string", format: "ipv4" },
    netmask: { type: "string", format: "ipv4" },
    gateway: { type: "string", format: "ipv4" },
    // dns 允许空字符串或合法 ipv4
    dns: {
      anyOf: [
        { type: "string", format: "ipv4" },
        { type: "string", const: "" },
      ],
    },
    // 如果也要对 dns2 做同样处理
    dns2: {
      anyOf: [
        { type: "string", format: "ipv4" },
        { type: "string", const: "" },
      ],
    },
    routes: {
      type: "array",
      items: {
        type: "object",
        required: ["dest", "netmask", "gw"],
        additionalProperties: false,
        properties: {
          dest: { type: "string", format: "ipv4" },
          netmask: { type: "string", format: "ipv4" },
          gw: { type: "string", format: "ipv4" },
        },
      },
    },
  },

  // 只有在 dhcp === false 时，才校验 ip/netmask/gateway 必填
  if: {
    properties: { dhcp: { const: false } },
  },
  then: {
    required: ["ip", "netmask", "gateway"],
  },
} as const;

/** 本地转发参数校验 */
export const NetLocalCfgSchema = {
  type: "object",
  required: ["enable", "port", "max_count", "encrypt"],
  additionalProperties: false,
  properties: {
    enable: { type: "boolean" }, // 是否启用本地转发服务
    port: { type: "integer", minimum: 1, maximum: 65535 }, // 本地服务监听端口
    max_count: { type: "integer", minimum: 1 }, // 最大连接数
    encrypt: { type: "boolean" }, // 是否加密 AIS 数据
  },
} as const;

/** ntp 服务参数校验 */
export const NetNtpCfgSchema = {
  type: "object",
  required: ["enable", "sync_hour", "ntp1_url", "ntp2_url"],
  additionalProperties: false,
  properties: {
    enable: { type: "boolean" }, // 是否启用 NTP 服务
    sync_hour: { type: "integer", minimum: 1 }, // 同步间隔（小时）
    ntp1_url: { type: "string", minLength: 1 }, // 主 NTP 地址
    ntp2_url: { type: "string" }, // 备份 NTP 地址（可空字符串）
  },
} as const;

/**
 * 转发传输配置参数校验
 */
export const NetTransmitCfgSchema = {
  type: "object",
  required: ["hosts"],
  additionalProperties: false,
  properties: {
    hosts: {
      type: "array",
      items: {
        type: "object",
        required: ["ip", "port", "encrypt", "enable"],
        additionalProperties: false,
        properties: {
          ip: { type: "string" }, // 目标服务器 IP
          port: { type: "integer", minimum: 1, maximum: 65535 }, // 目标端口
          encrypt: { type: "boolean" }, // 是否加密传输
          enable: { type: "boolean" }, // 是否启用此连接
        },
      },
    },
  },
} as const;
