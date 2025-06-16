import { IBaseDto } from "./Base";

export interface DatabaseConfig extends IBaseDto {
  type?: string; // 数据库类型 mysql oracle sqlserver postgresql
  host?: string;
  port?: string;
  user?: string;
  password?: string;
  database?: string;
  folderPath?: string; // 生成ts文件的路径
}

export interface DatabaseColumn {
  columnName: string; // 字段名
  columnType: string; // 字段类型
  columnComment?: string; // 注释
  columnDefault?: string | number | null; // 默认值 null
  isPrimaryKey?: number; // 是否是主键 1 是 0 否
  isNullable?: number; // 是否可为空 1 是 0 否
}
