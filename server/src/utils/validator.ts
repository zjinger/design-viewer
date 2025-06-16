export function isString(val: any): val is string {
  return typeof val === "string";
}

export function isNumber(val: any): val is number {
  return typeof val === "number" && !isNaN(val);
}

export function isInRange(val: number, min: number, max: number): boolean {
  return isNumber(val) && val >= min && val <= max;
}

export function isBoolean(val: any): val is boolean {
  return typeof val === "boolean";
}

export function isEmpty(val: any): boolean {
  return (
    val == undefined || val == null || (isString(val) && val.trim().length == 0)
  );
}
