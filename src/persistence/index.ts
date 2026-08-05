import { registerFormat, getFormat } from "./formatAdapter";
import { jsonFormat } from "./jsonFormat";

registerFormat(jsonFormat);

export { getFormat };
export type { FormatAdapter } from "./formatAdapter";
