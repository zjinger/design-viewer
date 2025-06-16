// import os from "os";
// import fs from "fs";
// import path from "path";
// import util from "util";
// import { exec } from "child_process";
// import { FastifyInstance } from "fastify";
// import { Database } from "better-sqlite3";

// const execAsync = util.promisify(exec);

// interface HealthStatus {
//   redisActive: boolean;
//   sqliteActive: boolean;
//   serialPortActive: boolean;
//   websocketActive: boolean;
//   storage: {
//     total: string;
//     used: string;
//     free: string;
//     mounted: boolean;
//   } | null;
//   ntpSync: boolean;
//   cpu: {
//     load: number[];
//   };
//   memory: {
//     free: number;
//     total: number;
//   };
//   network: {
//     serverPing: boolean;
//   };
// }

// export class HealthService {
//   private db: Database;
//   private server: FastifyInstance;
//   constructor(
//     private redisClient: any,
//     private websocketServer: { wsClients?: Set<any> },
//     private sdCardPath = "/mnt/sdcard",
//     private sqliteDbPath = "/data/ais.db",
//     private pingTarget = "114.114.114.114"
//   ) {}

//   public async getHealthStatus(): Promise<HealthStatus> {
//     const [
//       redisActive,
//       sqliteActive,
//       serialPortActive,
//       websocketActive,
//       // storage,
//       // ntpSync,
//       // serverPing,
//     ] = await Promise.all([
//       this.checkRedis(),
//       this.checkSQLite(),
//       this.checkSerialPort(),
//       this.checkWebSocketServer(),
//       // this.checkStorage(this.sdCardPath),
//       // this.checkNtpSync(),
//       // this.checkNetwork(this.pingTarget),
//     ]);

//     return {
//       redisActive,
//       sqliteActive,
//       serialPortActive,
//       // websocketActive,
//       // storage,
//       // ntpSync,
//       // cpu: this.getCpu(),
//       // memory: this.getMemory(),
//       // network: {
//       //   serverPing,
//       // },
//     };
//   }

//   private async checkRedis() {
//     return await this.server.isRedisAlive();
//   }

//   private async checkSQLite(): Promise<boolean> {
//     try {
//       const db = this.server.betterSqlite3;
//       db.prepare("SELECT 1").get();
//       db.close();
//       return true;
//     } catch (error) {
//       return false;
//     }
//   }

//   private async checkSerialPort(): Promise<boolean> {
//     return true;
//   }

//   private async checkWebSocketServer(): Promise<boolean> {
//     return this.server.wsClients && this.server.wsClients.size > 0;
//   }


//   private getCpu() {
//     return {
//       load: os.loadavg(),
//     };
//   }

//   private getMemory() {
//     return {
//       free: os.freemem(),
//       total: os.totalmem(),
//     };
//   }
// }
