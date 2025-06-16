/** 供电类型：1=外部电源，2=电池（如有其它枚举值可在此扩展） */
export enum PowerType {
  External = 1,
  Battery = 2,
}

/** 设备供电状态 */
export interface PowerState {
  /** 电压，单位 mV */
  U: number;
  /** 电流，单位 mA */
  I: number;
  /** 供电类型：1 外部；2 电池 */
  type: PowerType;
  /** 电池电量是否过低（仅当 type = Battery 有意义） */
  low_battery: boolean;
  /** 电池剩余容量百分比 */
  capacity: number;
}

/** 本船位置 */
export interface OwnVessel {
  utc: number; // Unix 时间戳（秒）
  lng: number; // 经度，1e-6 度
  lat: number; // 纬度，1e-6 度
}

/** 本地 / 远程会话的公共字段 */
interface BaseSession {
  local_ip: string;
  local_port: number;
  remote_ip: string;
  remote_port: number;
  /** 建连时间，“YYYY‑MM‑DD HH:mm:ss” */
  establish_time: string;
  /** 本次连接已持续的秒数 */
  duration_sec: number;
}

/** 本地转发服务的单个会话（监控速率 bps） */
export interface LocalSession extends BaseSession {
  /** 实时比特率 bit/s */
  bps: number;
}

/** 远程服务器的单个会话（统计字节数 bytes） */
export interface RemoteSession extends BaseSession {
  /** 已发送 / 接收总字节数 */
  bytes: number;
}

/** 本地转发服务状态 */
export interface LocalServer {
  /** 0=未启用；1=监听中；2=已建立连接 */
  state: number;
  /** 本地监听端口 */
  port: number;
  /** 当前已建立的所有连接 */
  sessions: LocalSession[];
}

/** 远程推送服务器配置与运行时状态 */
export interface RemoteServer {
  ip: string;
  port: number;
  /** 0=未启用；1=连接中；2=已连接 */
  state: number;
  /** 当前连接（若 state!==2，可为空对象占位） */
  session: RemoteSession;
}

/** 顶层 update 数据包 */
export interface SubUpdatePayload {
  power_state: PowerState;
  own_vessel: OwnVessel;
  local_server: LocalServer;
  remote_servers: RemoteServer[];
}
