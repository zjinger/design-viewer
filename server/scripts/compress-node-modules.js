// scripts/compress-node-modules.js
const { minify } = require("terser");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

const pattern = path.join(__dirname, "../build/node_modules/**/*.js");

glob(pattern, async (err, files) => {
  if (err) {
    console.error("❌ 查找 node_modules JS 文件失败:", err);
    process.exit(1);
  }

  console.log(`📦 共找到 ${files.length} 个 JS 文件，开始压缩 node_modules...`);

  for (const file of files) {
    if (file.endsWith(".min.js")) continue; // 跳过已压缩的文件
    try {
      const code = fs.readFileSync(file, "utf8");
      const result = await minify(code, {
        compress: true,
        mangle: true,
      });

      if (result.error) {
        console.error(`❌ 压缩失败: ${file}`, result.error);
        continue;
      }

      fs.writeFileSync(file, result.code, "utf8");
      console.log(`✅ 已压缩: ${path.relative(process.cwd(), file)}`);
    } catch (err) {
      console.warn(`⚠️ 跳过: ${file}，原因: ${err.message}`);
    }
  }

  console.log("🎉 node_modules JS 压缩完成！");
});
