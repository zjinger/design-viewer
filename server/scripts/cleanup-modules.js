// cleanup-modules.js

const fs   = require("fs");
const path = require("path");
const glob = require("glob");

const baseDir = path.resolve(__dirname, "../build/node_modules");

// 需要删除的文件类型（按后缀）
const filePatterns = [
  "**/*.md",
  "**/*.markdown",
  "**/*.map",
  "**/*.ts",
  "**/*.d.ts",
  "**/*.tsbuildinfo",
  "**/tsconfig*.json",
  "**/package-lock.json",
  // 常见的元数据文件
  "**/README*",
  "**/CHANGELOG*",
  "**/LICENSE*",
];

// 需要删除的文件夹名
const dirPatterns = [
  "**/test",
  "**/__tests__",
  "**/tests",
  "**/doc",
  "**/docs",
  "**/example",
  "**/examples",
  "**/benchmark",
  // 新增：清理 .bin 和 .github 目录
  "**/.bin",
  "**/.github",
  // 可选：清理 husky 钩子目录
  "**/.husky"
];

/**
 * 删除匹配的文件或目录
 * @param {string[]} patterns 
 * @param {"file"|"dir"} type 
 */
function deleteMatched(patterns, type) {
  for (const pattern of patterns) {
    const fullPattern = path.join(baseDir, pattern);
    glob
      .sync(fullPattern, { nodir: type === "file" })
      .forEach(target => {
        try {
          if (type === "file") {
            fs.unlinkSync(target);
          } else {
            fs.rmSync(target, { recursive: true, force: true });
          }
          console.log(`🧹 已删除 ${type}: ${path.relative(baseDir, target)}`);
        } catch (err) {
          console.error(`❌ 删除失败: ${target}`, err);
        }
      });
  }
}

// 删除匹配的文件
deleteMatched(filePatterns, "file");

// 删除匹配的目录
deleteMatched(dirPatterns, "dir");

// 递归删除空目录
function deleteEmptyDirs(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }
  if (entries.length === 0) {
    fs.rmdirSync(dir);
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      deleteEmptyDirs(full);
    }
  }
  // 如果子目录删完之后自己也空了
  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}

deleteEmptyDirs(baseDir);
console.log("🎉 node_modules 清理完成！");
