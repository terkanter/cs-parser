import type { FieldProps } from "@/shared/lib/field.type";
import { useFieldValue, useTranslate } from "ra-core";
import type { HTMLAttributes } from "react";

export const TextField = <RecordType extends Record<string, any> = Record<string, any>>({
  defaultValue,
  source,
  record,
  empty,
  ...rest
}: TextFieldProps<RecordType>) => {
  const value = useFieldValue({ defaultValue, source, record });
  const translate = useTranslate();

  if (value == null) {
    if (!empty) {
      return null;
    }

    return <span {...rest}>{typeof empty === "string" ? translate(empty, { _: empty }) : empty}</span>;
  }

  return <span {...rest}>{typeof value !== "string" ? value.toString() : value}</span>;
};

export interface TextFieldProps<RecordType extends Record<string, any> = Record<string, any>>
  extends FieldProps<RecordType>,
    HTMLAttributes<HTMLSpanElement> {}
