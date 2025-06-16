export interface FlowControlCfg {
  trigger_min: number; // 基站报文触发判断时间（分钟）
  trigger_count: number; // 触发次数
  timeout_min: number; // 超时恢复时间（分钟）
  rule1Enable: boolean; // 规则1
  rule2Enable: boolean; // 规则2
  rule1?: FlowMatchingMmsi[]; // 岸基mmsi 列表
  rule2Prefix: string[]; // 特征匹配范围前缀
  rule2?: FlowMatchingArea[]; // 特征匹配范围
}

export interface FlowMatchingMmsi {
  id?: string;
  mmsi: string;
  name?: string;
}

export interface FlowMatchingArea {
  id?: string;
  name: string;
  shape: "circle" | "polygon";
  wkt: string; // WKT 格式："POINT(...)" 或 "POLYGON(...)"
  radius?: number; // 半径，单位：米，仅在 WKT 为 POINT 时有效；POLYGON 填 0
  remark?: string;
}

/** 区域匹配单元：WKT + 半径（当为圆形时） */
export interface FlowControlArea {
  wkt: string; // WKT 格式："POINT(...)" 或 "POLYGON(...)"
  r: number; // 半径，单位：米，仅在 WKT 为 POINT 时有效；POLYGON 填 0
}

/** 特征匹配规则（基于 MMSI 前缀 + 区域） */
export interface FlowControlRule2 {
  enable: boolean;
  prefix: string[];
  areas: FlowControlArea[];
}
/** 报文流控总配置 */
export interface SubFlowControlCfg {
  trigger_min: number; // 基站报文触发判断时间（分钟）
  trigger_count: number; // 触发次数
  timeout_min: number; // 超时恢复时间（分钟）
  rule1: {
    enable: boolean;
    base_mmsi: string[]; // 9位整数，显示填零：为凑齐 9 位而补零，不算作真正的“0 开头”标识。
  };
  rule2: FlowControlRule2;
}
export const FlowControlCfgSchema = {
  type: "object",
  required: [
    "trigger_min",
    "trigger_count",
    "timeout_min",
    "rule1Enable",
    "rule2Enable",
    "rule2Prefix",
    "rule1",
    "rule2",
  ],
  additionalProperties: true,

  properties: {
    trigger_min: {
      type: "integer",
      minimum: 0,
      description: "判断接收基站4号报文的周期，单位：分钟",
    },
    trigger_count: {
      type: "integer",
      minimum: 0,
      description: "trigger_min 时间内接收到基站4号报文的次数",
    },
    timeout_min: {
      type: "integer",
      minimum: 0,
      description: "最后一次接收到基站4号报文后的超时时长，单位：分钟",
    },
    rule1Enable: {
      description: "是否启用基站 MMSI 白名单规则",
      type: "boolean",
    },
    rule2Enable: {
      description: "是否启用基站前缀/范围规则",
      type: "boolean",
    },
    rule2Prefix: {
      type: "array",
      description: "匹配的基站 MMSI 前缀列表",
      items: { type: "string" },
    },
    rule1: {
      type: "array",
      items: {
        type: "object",
        required: ["mmsi"],
        additionalProperties: true,
        properties: {
          mmsi: {
            type: "string",
            pattern: "^[0-9]{1,9}$",
          },
        },
      },
    },
    rule2: {
      type: "array",
      items: {
        type: "object",
        required: ["wkt", "radius"],
        additionalProperties: true,
        properties: {
          wkt: {
            type: "string",
            minLength: 1,
            description: "WKT 格式几何串",
          },
          radius: {
            type: "number",
            minimum: 0,
            description: "当 r=0 表示面，多于 0 表示圆半径（米）",
          },
        },
      },
    },
  },
} as const;
/**
 * 流控策略参数校验
 */
export const SubFlowControlCfgSchema = {
  type: "object",
  required: ["trigger_min", "trigger_count", "timeout_min", "rule1", "rule2"],
  additionalProperties: true,

  properties: {
    trigger_min: {
      type: "integer",
      minimum: 0,
      description: "判断接收基站4号报文的周期，单位：分钟",
    },
    trigger_count: {
      type: "integer",
      minimum: 0,
      description: "trigger_min 时间内接收到基站4号报文的次数",
    },
    timeout_min: {
      type: "integer",
      minimum: 0,
      description: "最后一次接收到基站4号报文后的超时时长，单位：分钟",
    },

    rule1: {
      type: "object",
      required: ["enable", "base_mmsi"],
      additionalProperties: false,

      properties: {
        enable: {
          type: "boolean",
          description: "是否启用基站 MMSI 白名单规则",
        },
        base_mmsi: {
          type: "array",
          description: "匹配的基站 MMSI 列表",
          items: { type: "string", pattern: "^[0-9]{1,9}$" },
        },
      },
    },

    rule2: {
      type: "object",
      required: ["enable", "prefix", "areas"],
      additionalProperties: false,

      properties: {
        enable: {
          type: "boolean",
          description: "是否启用基站前缀/范围规则",
        },
        prefix: {
          type: "array",
          description: "匹配的基站 MMSI 前缀列表",
          items: { type: "integer" },
        },
        areas: {
          type: "array",
          description: "基站范围列表；r=0 时 wkt 为 POLYGON，否则为 POINT",
          items: {
            type: "object",
            required: ["wkt", "r"],
            additionalProperties: false,

            properties: {
              wkt: {
                type: "string",
                minLength: 1,
                description: "WKT 格式几何串",
              },
              r: {
                type: "integer",
                minimum: 0,
                description: "当 r=0 表示面，多于 0 表示圆半径（米）",
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * 流控策略范围保存时参数校验
 */
export const SaveAreaSchema = {
  body: {
    type: "object",
    required: ["shape", "wkt"],
    additionalProperties: false,
    properties: {
      id: { type: "string", minLength: 1 }, // 更新时传，新增可不传
      name: {
        type: "string",
        minLength: 1,
        maxLength: 50,
        description: "区域名称",
      },
      shape: {
        type: "string",
        enum: ["circle", "polygon"],
        description: "区域形状",
      },
      wkt: {
        type: "string",
        pattern: "^(POINT\\(|POLYGON\\().*", // 只做粗略限制，可进一步精细
        description: "WKT格式",
      },
      radius: {
        type: "integer",
        minimum: 0,
        maximum: 100000,
        description: "半径（仅当shape为circle时有效）",
      },
      remark: {
        type: "string",
        maxLength: 200,
      },
    },
  },
};
