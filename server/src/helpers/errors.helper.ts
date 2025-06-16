export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const ERRORS = {
  invalidToken: new AppError("无效Token", 401),
  userExists: new AppError("用户已经存在", 409),
  userNotExists: new AppError("用户不存在", 404),
  userCredError: new AppError("用户名或者密码不正确", 401),
  userLoginError: new AppError("用户登录失败", 500),
  userSaveError: new AppError("用户保存失败", 500),
  userPwdUpdateError: new AppError("密码更新失败", 500),
  invalidRequest: new AppError("无效请求", 400),
  internalServerError: new AppError("服务器内部错误", 500),
  unauthorizedAccess: new AppError("未授权", 401),
  permissionDenied: new AppError("无权访问", 403),
  internalError: new AppError("网络异常", 500),

  // 文件上传下载
  fileNotFound: new AppError("文件不存在", 404),
  fileUploadError: new AppError("文件上传失败", 500),
  fileDownloadError: new AppError("文件下载失败", 500),
  // 配置
  confImportError: new AppError("配置导入失败", 500),
  confExportReadError: new AppError("配置读取失败", 500),
  confExportError: new AppError("配置导出失败", 500),
  resetConfError: new AppError("恢复出厂设置失败", 500),
  setHybridConfError: new AppError("综合配置设置失败", 500),
  getHybridConfError: new AppError("综合配置获取失败", 500),
  getUpgradeStatus: new AppError("获取远程升级状态", 500),

  // 系统维护
  firmwareUploadError: new AppError("固件上传失败", 500),
  firmwareUploadTypeError: new AppError("固件上传类型不匹配", 500),
  firmwareUpgradeError: new AppError("固件升级失败", 500),
  firmwareNotFound: new AppError("固件不存在", 404),
  firmwareExtError: new AppError("升级包格式不符", 500),
  rebootError: new AppError("重启失败", 500),

  // device
  deviceInfoError: new AppError("获取系统信息失败", 500),

  // ais
  aisLogListError: new AppError("AIS日志查询失败", 500),
  aisLogEarliestTimeError: new AppError("获取AIS日志最早存储时间失败", 500),

  // log
  logListError: new AppError("日志查询失败", 500),
  logEarliestTimeError: new AppError("获取日志最早存储时间失败", 500),

  // flow 省流
  flowTplReadError: new AppError("模板文件读取失败", 500),
  flowTplDownloadError: new AppError("模板文件下载失败", 500),
  flowTplUploadError: new AppError("模板文件上传失败", 500),
  setMatchingAreaError: new AppError("设置特定匹配范围失败", 500),

  // install log
  installLogListError: new AppError("安装日志查询失败", 500),
  installLogInfoError: new AppError("未找到对应的安装日志", 404),
  installLogSaveError: new AppError("保存安装日志失败", 500),
  installLogDeleteError: new AppError("删除安装日志失败", 500),
  installLogUploadError: new AppError("附件上传失败", 500),
  installLogPreviewError: new AppError("附件预览失败", 500),

  // upload
  uploadError: new AppError("文件上传失败", 500),
  contentNotFoundError: new AppError("文件不存在或已删除", 404),
  contentRemoveError: new AppError("文件移除失败", 500),
  invalidUploadType: new AppError("不支持此类型上传", 400),

  // redis 交互
  rpcError: new AppError("操作失败", 500),
};
