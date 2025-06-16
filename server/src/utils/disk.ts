import { execSync, exec } from "child_process";
import fs from "fs";
import { promisify } from "util";
const execAsync = promisify(exec);
interface DiskStatus {
  total: number; // 总容量，单位：字节
  used: number; // 已用容量，单位：字节
  available: number; // 剩余容量，单位：字节
  mountStatus: boolean; // 是否已挂载
  mountPoint: string; // 挂载路径
}

export const diskUtil = {
  /**
   * 获取磁盘剩余容量
   * @param dir
   * @returns
   */
  getDiskFreeRatio: (dir = "."): number => {
    try {
      const out = execSync(`df -k ${dir}`).toString().split("\n")[1];
      const [_, size, , avail] = out.trim().split(/\s+/);
      return parseInt(avail) / parseInt(size);
    } catch {
      return 1;
    }
  },

  /**
   * 挂载SD卡的位置
   * @param mountPoint
   * @returns
   */
  getDiskStatus: async (mountPoint: string): Promise<DiskStatus> => {
    let isMounted = false;
    try {
      const { stdout: mountInfo } = await execAsync("mount");
      isMounted = mountInfo.includes(mountPoint);
    } catch {
      isMounted = false;
    }

    if (!isMounted) {
      return {
        total: 0,
        used: 0,
        available: 0,
        mountStatus: false,
        mountPoint,
      };
    }

    const stat = fs.statSync(mountPoint);
    if (!stat.isDirectory()) {
      throw new Error(`${mountPoint} is not a valid directory`);
    }

    const { stdout } = await execAsync(`df -k ${mountPoint} | tail -1`);
    const parts = stdout.trim().split(/\s+/);

    const total = parseInt(parts[1], 10) * 1024; // 总容量
    const used = parseInt(parts[2], 10) * 1024; // 已用
    const available = parseInt(parts[3], 10) * 1024; // 剩余

    return {
      total,
      used,
      available,
      mountStatus: true,
      mountPoint,
    };
  },
};
