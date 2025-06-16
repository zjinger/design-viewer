#!/usr/bin/env node

/**
 * copy-build.js
 *
 * 用法：
 *   - 增量复制（默认）：node copy-build.js
 *   - 全量复制：        node copy-build.js full
 *
 * full 模式下：完整复制 build 目录，跳过符号链接、跳过复制过程中任何错误
 * selective 模式下：仅复制 app 目录、.env.prod、package.json，以及 www 下除 tiles、pdfjs 之外的内容
 */

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

/**
 * 递归复制目录：对每个条目，无论发生什么错误都跳过，
 * 确保脚本不中断。
 */
async function copyDir(srcDir, dstDir) {
  try {
    await fsp.mkdir(dstDir, { recursive: true });
  } catch {
    // 忽略 mkdir 错误
  }

  let entries;
  try {
    entries = await fsp.readdir(srcDir, { withFileTypes: true });
  } catch (err) {
    console.warn(
      `⚠️ 无法读取目录，跳过：${srcDir} （${err.code || err.message}）`
    );
    return;
  }

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);

    // 对单个条目也要 try/catch，避免任何错误冒泡
    try {
      const stat = await fsp.lstat(srcPath);

      // 跳过符号链接
      if (stat.isSymbolicLink()) {
        // console.log(`⛔ 符号链接，跳过: ${srcPath}`);
        continue;
      }

      if (stat.isDirectory()) {
        // 目录 -> 递归
        await copyDir(srcPath, dstPath);
      } else {
        // 文件 -> 复制
        await fsp.copyFile(srcPath, dstPath);
      }
    } catch (err) {
      // 任何复制／读取／权限错误都跳过
      console.warn(
        `⚠️ 处理失败，跳过：${srcPath} （${err.code || err.message}）`
      );
    }
  }
}

async function deleteDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      await fsp.rm(dir, { recursive: true, force: true });
      console.log(`🗑 已删除目标目录：${dir}`);
    }
  } catch (err) {
    console.warn(
      `⚠️ 删除 assets 失败，跳过：${dir} （${err.code || err.message}）`
    );
  }
}
async function main() {
  const ROOT = __dirname;
  const SRC = path.join(ROOT, "..", "build");
  const DST = path.join(
    ROOT,
    "..",
    "..",
    "upgrade",
    "src",
    "node-service",
    "build"
  );

  const wwwDst = path.join(DST, "www");

  const mode = process.argv[2] === "full" ? "full" : "selective";
  console.log(
    `📦 运行模式：${
      mode === "full"
        ? "【full】完整复制 build 目录"
        : "【selective】增量复制指定文件"
    }\n`
  );

  if (!fs.existsSync(SRC)) {
    console.error(`❌ 源目录不存在：${SRC}`);
    process.exit(1);
  }

  if (mode === "full") {
    // —— 在复制前删除目标下的 www/assets 文件夹 —— //
    const assetsDst = path.join(wwwDst, "assets");
    // 如果 assets 存在，则递归删除
    await deleteDir(assetsDst);
    // 删除node_modules
    const modulesDir = path.join(DST, "node_modules");
    await deleteDir(modulesDir);
    console.log("🔄 开始全量复制（跳过符号链接及所有错误）…");
    await copyDir(SRC, DST);
    console.log("\n✅ 全量复制完成！");
    return;
  }

  // selective 模式：增量复制
  console.log("🔄 开始增量复制…");
  // 确保基础目录
  await fsp.mkdir(DST, { recursive: true });
  await fsp.mkdir(path.join(DST, "www"), { recursive: true });

  // 1) 复制 app 整个目录
  const srcApp = path.join(SRC, "app");
  const dstApp = path.join(DST, "app");
  if (fs.existsSync(srcApp)) {
    await fsp.cp(srcApp, dstApp, { recursive: true, force: true });
    console.log("✅ 已复制目录：app");
  } else {
    console.warn(`⚠️ 跳过：不存在 ${srcApp}`);
  }

  // 2) 复制 .env.prod & package.json
  for (const name of [".env.prod", "package.json"]) {
    const s = path.join(SRC, name);
    const d = path.join(DST, name);
    if (fs.existsSync(s)) {
      await fsp.cp(s, d, { force: true });
      console.log(`✅ 已复制文件：${name}`);
    } else {
      console.warn(`⚠️ 跳过：不存在 ${s}`);
    }
  }

  // 3) 复制 www 下内容
  const wwwSrc = path.join(SRC, "www");
  if (fs.existsSync(wwwSrc)) {
    // —— 在复制前删除目标下的 www/assets 文件夹 —— //
    const assetsDst = path.join(wwwDst, "assets");
    // 如果 assets 存在，则递归删除
    await deleteDir(assetsDst);
    // —— 删除完成 —— //
    const list = await fsp.readdir(wwwSrc, { withFileTypes: true });
    for (const ent of list) {
      // if (ent.name === 'tiles' || ent.name === 'pdfjs') continue;
      await fsp.cp(path.join(wwwSrc, ent.name), path.join(wwwDst, ent.name), {
        recursive: true,
        force: true,
      });
      console.log(`✅ 已复制 www/${ent.name}`);
    }
  } else {
    console.warn(`⚠️ 跳过：www 不存在 ${wwwSrc}`);
  }

  console.log("\n🎉 增量复制完成！");
}

main().catch((err) => {
  console.error("❌ 脚本致命错误：", err);
  process.exit(1);
});
