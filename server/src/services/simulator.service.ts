import { utils } from "@/utils/utils";
import { promisify } from "util";

/**
 * ais 数据模拟
 * @param redis
 * @param channel
 * @param count
 * @param delay
 */
export async function simulateAISMessages(
  redis: any,
  channel: string,
  count = 10,
  delay = 200
) {
  const sleep = promisify(setTimeout);

  for (let i = 1; i <= count; i++) {
    const msg = "$AIVDM,1,1,,B,15Muq@0P00PD;LTK>8P:wvDl0000,0*7E"; // 随便一条
    const payload = `${Date.now()},${new Date().toISOString()},413123123,1,${Buffer.from(
      msg
    ).toString("base64")}`;
    await redis.publish(channel, payload);
    console.log(`✅ 已发布：${payload}`);
    await sleep(delay);
  }
}

/**
 * log 数据模拟
 * @param redis
 * @param channel
 * @param count
 * @param delay
 */
export async function simulateLOGMessages(
  redis: any,
  channel: string,
  count = 10,
  delay = 200
) {
  const sleep = promisify(setTimeout);

  for (let i = 1; i <= count; i++) {
    const text = Buffer.from("串口打开失败，已自动重试").toString("base64");
    const payload = `${Date.now()},${new Date().toISOString()},WARN,${text}`;
    await redis.publish(channel, payload);
    console.log(`✅ 已发布：${payload}`);
    await sleep(delay);
  }
}
