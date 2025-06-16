/*********************************************************************
 * 固件信息工具：读取 version.txt，返回 { version, description }
 *   - 第一行：版本号（去掉可能的 “v” 前缀）
 *   - 第二行及以后：升级描述，保持原有换行格式
 *   - 读取失败时，version 置为 "unknown"，description 置为空字符串
 *********************************************************************/
import fs from "fs";
import path from "path";

export interface FirmwareInfo {
  version: string;
  description: string;
}

export function getFirmwareInfo(uploadDir: string): FirmwareInfo {
  try {
    const VERSION_FILE = path.join(uploadDir, "unpacked", "version.txt");
    // 同步读取整个文件内容
    const raw = fs.readFileSync(VERSION_FILE, "utf-8").trim();
    // 按照换行拆分成数组
    const lines = raw.split(/\r?\n/);

    // 第一行：版本号，去掉可能的 "v" 前缀
    const firstLine = (lines[0] || "").trim();
    const version = firstLine.replace(/^v/i, "") || "unknown";

    // 第二行及以后，全量作为 description（保留多行格式）
    let description = "";
    if (lines.length > 1) {
      // slice(1) 会返回一个包含第二行及以后所有行的数组
      description = lines.slice(1).join("\n").trim();
    }

    return { version, description };
  } catch {
    // 如果读取或解析发生任何错误，就返回 version="unknown", description=""
    return { version: "unknown", description: "" };
  }
}
