/**
 * 控制指令
 * 还原默认设置  cmd:1 arg1:0 arg2:""
 */
export interface SubConfControl {
  cmd: number; // 类型
  arg1: number; // 指令参数
  arg2: string; // 指令参数
}

/** 综合配置 */
export interface HybridCfg {
  name: string;
  mmsi?: string;
  tag_block: boolean; //
  talkerIdEnabled?: boolean; // 启用 talker id ,默认false
  from: string; // 原始talker id 前缀
  to: string; // 替换后的talker id 前缀
  ifAisLogEnabled: boolean;
}

/**
 * 超管综合配置
 */
export interface SuperHybridCfg {
  ip: string; // 管理网口的ip地址
  netmask: string; // 子网掩码
  ip2?: string; // 附加管理网口ip地址
  netmask2?: string;
  ifRemoteUpgrade: boolean;
}

export const HybridCfgSchema = {
  type: "object",
  required: [
    "name",
    "tag_block",
    "talkerIdEnabled",
    "mmsi",
    // "to",
    "ifAisLogEnabled",
  ],
  additionalProperties: true, // 禁止多余字段
  properties: {
    mmsi: {
      type: "string",
      pattern: "^[0-9]{1,9}$",
    },
    name: {
      type: "string",
      minLength: 1,
      maxLength: 15,
    },
    /* 是否启用 TAG‑BLOCK */
    tag_block: { type: "boolean" },
    /** 是否启用talker id */
    talkerIdEnabled: { type: "boolean" },
    /** 是否启用ais 日志存储 */
    ifAisLogEnabled: { type: "boolean" },
    // Taker ID
    // AI 标准AIS船台
    // AB AIS基站
    // AR AIS接收站
    // AD 双工转发站
    // AS 单工转发站
    // to: { type: "string" }, // , pattern: "^[A-Z]{2}$"
  },
} as const;

export const SuperHybridCfgSchema = {
  type: "object",
  required: ["ip", "netmask", "ifRemoteUpgrade"],
  additionalProperties: true, // 禁止多余字段
  properties: {
    ip: { type: "string", format: "ipv4" },
    ip2: { type: "string", format: "ipv4" },
    netmask: { type: "string", format: "ipv4" },
    ifRemoteUpgrade: { type: "boolean" }, // 是否启用远程升级
  },
} as const;
