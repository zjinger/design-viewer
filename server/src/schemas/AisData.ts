/**
 * redis 订阅 ais 报文
 */
export interface SubAisMsg {
  utc: number; // utc整数，utc毫秒
  ts: string; // 字符串，对应的北京时间
  mmsi: string; // 整数，船舶mmsi
  msg: number; // 整数，报文消息号
  content: string; //字符串，ais 原始报文的base64 编码
}

/**
 * AIS 转发配置
 */
export interface SubAisCfg {
  name: string;
  mmsi: string;
  tag_block: boolean;
  talker_id_replace: {
    enable: boolean;
    from: string;
    to: string;
  };
}

/**
 * AIS 数据表 (tbl_ais)
 * 通过  storage-subscriber.ts 存储，每天一个表
 */
export interface IAisDataDto extends SubAisMsg {
  id: string;
}

export interface IAisLogSearchDto {
  startTime: string;
  endTime: string;
  startTimeMs: number;
  endTimeMs: number;
  currentPage: number;
  pageRecord: number;
  order?: "asc" | "desc"; // 默认是desc 降序
}

export const AisCfgSchema = {
  type: "object",
  required: ["name", "mmsi", "tag_block", "talker_id_replace"],
  additionalProperties: false, // 禁止多余字段
  properties: {
    name: {
      type: "string",
      minLength: 1,
      maxLength: 15,
    },
    /* MMSI：9 位数字（国际规定）*/
    mmsi: {
      type: "string",
      pattern: "^[0-9]{1,9}$",
    },
    /* 是否启用 TAG‑BLOCK */
    tag_block: { type: "boolean" },
    /* talkerId 替换子对象 */
    talker_id_replace: {
      type: "object",
      required: ["enable", "from", "to"],
      additionalProperties: false,
      properties: {
        enable: { type: "boolean" },
        /* “AI”“AB” 这样的两位大写字母 */
        from: { type: "string", pattern: "^[A-Z]{2}$" },
        to: { type: "string", pattern: "^[A-Z]{2}$" },
      },
    },
  },
} as const; //推断成字面量类型
