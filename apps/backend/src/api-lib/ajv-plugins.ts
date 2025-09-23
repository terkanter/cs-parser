import type { Ajv } from "ajv";
import { fullFormats } from "ajv-formats/dist/formats";

export const ajvPlugins = [
  (ajv: Ajv) => {
    for (const format in fullFormats) {
      ajv.addFormat(format, fullFormats[format]);
    }
  },
];
