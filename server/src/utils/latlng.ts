export const latlngUtil = {
  /**
   * 将百万分之一度的坐标转换成 DMS（度分秒）字符串
   * @param rawValue 百万分之一度的值，例如 39123456 表示 39.123456°
   * @param isLat 是否纬度（true → N/S，false → E/W）
   * @returns 格式化好的 DMS 字符串，比如 "39°07′24.44″ N"
   */
  formatDMS: (rawValue: number, isLat: boolean): string => {
    const decimalDeg = rawValue / 1e6;
    const hemisphere = isLat
      ? decimalDeg >= 0
        ? "N"
        : "S"
      : decimalDeg >= 0
      ? "E"
      : "W";
    const absDeg = Math.abs(decimalDeg);

    const degrees = Math.floor(absDeg);
    const minutesFull = (absDeg - degrees) * 60;
    const minutes = Math.floor(minutesFull);
    const secondsFull = (minutesFull - minutes) * 60;
    // 保留两位小数秒数
    const seconds = Math.round(secondsFull * 100) / 100;

    return `${degrees}°${minutes}′${seconds.toFixed(2)}″ ${hemisphere}`;
  },
};
