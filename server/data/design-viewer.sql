/*
 Navicat Premium Data Transfer
 
 Source Server         : design-viewer
 Source Server Type    : SQLite
 Source Server Version : 3035005 (3.35.5)
 Source Schema         : main
 
 Target Server Type    : SQLite
 Target Server Version : 3035005 (3.35.5)
 File Encoding         : 65001
 
 Date: 11/03/2025 18:09:04
 */
PRAGMA foreign_keys = false;

-- ----------------------------
-- Table structure for tbl_userinfo (用户表)
-- ----------------------------
DROP TABLE IF EXISTS "tbl_userinfo";

CREATE TABLE IF NOT EXISTS "tbl_userinfo" (
  "id" VARCHAR(36) PRIMARY KEY,
  "username" VARCHAR(50) NOT NULL,
  "password" VARCHAR(50) NOT NULL,
  "role" VARCHAR(20) NOT NULL DEFAULT 'admin',
  "remark" TEXT,
  "pwdChangedAt" INTEGER NOT NULL DEFAULT 0,
  "sysCreated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sysUpdated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sysDeleted" TINYINT(1) NOT NULL DEFAULT 0
);

-- ----------------------------
-- Table structure for tbl_projects (项目表)
-- ----------------------------
DROP TABLE IF EXISTS "tbl_projects";

CREATE TABLE IF NOT EXISTS "tbl_projects" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sysCreated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sysUpdated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sysDeleted" TINYINT(1) NOT NULL DEFAULT 0
);

-- ----------------------------
-- Table structure for tbl_files (文件表)
-- ----------------------------
DROP TABLE IF EXISTS "tbl_files";

CREATE TABLE IF NOT EXISTS "tbl_files" (
  "id" VARCHAR(36) PRIMARY KEY,
  "projectId" VARCHAR(36) NOT NULL,
  "fileName" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileType" TEXT NOT NULL,
  "category" TEXT,
  "parentId" VARCHAR(36),
  "uploaderId" VARCHAR(36),
  "uploadTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sysCreated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sysUpdated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sysDeleted" TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY ("projectId") REFERENCES "tbl_projects"("id"),
  FOREIGN KEY ("parentId") REFERENCES "tbl_files"("id"),
  FOREIGN KEY ("uploaderId") REFERENCES "tbl_userinfo"("id")
);

-- ----------------------------
-- Table structure for tbl_projects_uploads (项目-文件关联表)
-- ----------------------------
DROP TABLE IF EXISTS "tbl_projects_files";

CREATE TABLE IF NOT EXISTS "tbl_projects_files" (
  "projectId" VARCHAR(36) NOT NULL,
  "fileId" VARCHAR(36) NOT NULL,
  PRIMARY KEY ("projectId", "fileId"),
  FOREIGN KEY ("projectId") REFERENCES "tbl_projects"("id"),
  FOREIGN KEY ("fileId") REFERENCES "tbl_files"("id")
);

-- ----------------------------
-- Table structure for tbl_loginfo (日志表)
-- ----------------------------
DROP TABLE IF EXISTS "tbl_loginfo";

CREATE TABLE IF NOT EXISTS "tbl_loginfo" (
  "id" VARCHAR(36) PRIMARY KEY,
  "eventType" VARCHAR(50) NOT NULL,
  "logType" VARCHAR(50) NOT NULL,
  "userId" VARCHAR(36) NOT NULL,
  "username" VARCHAR(50) NOT NULL,
  "hostName" VARCHAR(50),
  "sourceIp" TEXT,
  "destinationIp" TEXT,
  "operationDesc" TEXT NOT NULL,
  "browserName" VARCHAR(200),
  "status" TINYINT(1) NOT NULL DEFAULT 1,
  "errorMsg" TEXT,
  "tip" TEXT,
  "utc" INTEGER,
  "ts" VARCHAR(100),
  "durationMs" INT NOT NULL,
  "sysCreated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sysUpdated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sysDeleted" TINYINT(1) NOT NULL DEFAULT 0
);

-- ----------------------------
-- Table structure for tbl_upgrade (升级记录表)
-- ----------------------------
DROP TABLE IF EXISTS "tbl_upgrade";

CREATE TABLE IF NOT EXISTS "tbl_upgrade" (
  "id" VARCHAR(36) PRIMARY KEY,
  "firmwareVer" TEXT NOT NULL,
  "upgradeStatus" TINYINT(1) NOT NULL DEFAULT 0,
  "sysCreated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sysUpdated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sysDeleted" TINYINT(1) NOT NULL DEFAULT 0
);

-- 索引（必要）
CREATE INDEX IF NOT EXISTS idx_tbl_projects_name ON "tbl_projects"("name");

CREATE INDEX IF NOT EXISTS idx_tbl_files_projectId ON "tbl_files"("projectId");

CREATE INDEX IF NOT EXISTS idx_tbl_files_parentId ON "tbl_files"("parentId");

CREATE INDEX IF NOT EXISTS idx_tbl_userinfo_username ON "tbl_userinfo"("username");

CREATE INDEX IF NOT EXISTS idx_tbl_projects_uploads_project ON "tbl_projects_files"("projectId");

PRAGMA foreign_keys = true;