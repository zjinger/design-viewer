import Database from "better-sqlite3";
import path from "path";
import fs from "fs-extra";
import { utils } from "@/utils/utils";
import { FastifyInstance } from "fastify";
import { getDbFilePath } from "@/utils/getEnvPath";
// 插入基础数据
const insertBaseData = async (
  db: Database.Database,
  server: FastifyInstance
) => {
  try {
    // 设置默认超级管理员
    const stmt = db.prepare(
      "INSERT INTO tbl_userinfo (id,username, password, role) VALUES (?,?, ?, ?)"
    );
    const hashedSaPwd = await utils.genSalt(10, "Super@2o25");
    const hashedAdPwd = await utils.genSalt(10, "Admin_@2025");
    // 设置默认超级管理员
    stmt.run(utils.genUUID(), "super", hashedSaPwd, "super_admin");
    // 设置默认普通管理员
    stmt.run(utils.genUUID(), "admin", hashedAdPwd, "admin");
    server.log.info("默认账户设置成功");
    // 设置默认的策略，支持ais本地存储，支持远程升级
    // const vesselStmt = db.prepare(
    //   "INSERT INTO tbl_vesselinfo (id,ifAisLogEnabled, ifRemoteUpgrade) VALUES (?,?, ?)"
    // );
    // vesselStmt.run(utils.genUUID(), 1, 1);
    // server.log.info("默认策略设置成功");
  } catch (err) {
    server.log.error(err, "默认数据设置失败");
  }
};

const createDatabase = async (
  dbPath: string,
  schemaPath: string,
  server: FastifyInstance
) => {
  try {
    fs.ensureDirSync(path.dirname(dbPath));
    const tempDb = new Database(dbPath);
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema 文件不存在: ${schemaPath}`);
    }
    const schema = fs.readFileSync(schemaPath, "utf8");
    server.log.info(`开始初始化 DB，schema 来自 ${schemaPath}`);
    tempDb.exec(schema);
    await insertBaseData(tempDb, server);
    tempDb.close();
    server.log.info("数据库初始化完成");
  } catch (err) {
    server.log.error({ err }, "数据库初始化失败");
    throw err;
  }
};

/**
 * 重置所有用户的 pwdChangedAt 字段为 0，
 * 以防止终端重启后因系统时间回退导致的登录问题。
 */
const resetPwdChangedAt = async (dbPath: string, server: FastifyInstance) => {
  try {
    // 在更改前确保数据库文件存在
    const db = new Database(dbPath);
    // 将所有用户的 pwdChangedAt 重置为 0
    const stmt = db.prepare(`
      UPDATE tbl_userinfo
      SET pwdChangedAt = 0
      WHERE pwdChangedAt IS NOT NULL
    `);
    stmt.run();
    db.close();
  } catch (err) {
    server.log.error(err, "重置 pwdChangedAt 时出错");
  }
};

export const initDb = async (server: FastifyInstance) => {
  const curDir = process.cwd(); // 当前目录
  const sqlPath = path.join(curDir, "data"); // 默认数据库路径
  // 数据库结构文件路径
  const schemaPath = path.join(sqlPath, "design-viewer.sql"); // 数据库结构文件路径
  // 数据库文件路径
  const dbPath = getDbFilePath();
  server.log.info(`Database schema path: ${schemaPath}`);
  server.log.info(`Database db path: ${dbPath}`);
  // 判断是否需要初始化
  let needInit = true;
  try {
    const stat = fs.statSync(dbPath);
    needInit = stat.size === 0;
  } catch {
    needInit = true;
  }

  if (needInit) {
    server.log.info("检测到数据库需要初始化，开始执行 createDatabase");
    await createDatabase(dbPath, schemaPath, server);
  } else {
    await resetPwdChangedAt(dbPath, server);
    server.log.info("数据库已存在且非空，跳过初始化");
  }
  const db = new Database(dbPath);
  return {
    class: Database,
    connection: db,
  };
};
