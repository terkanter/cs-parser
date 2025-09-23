import { Badge } from "@/shared/components/ui/badge";
import type { FieldProps } from "@/shared/lib/field.type";
import { type RaRecord, useFieldValue, useTranslate } from "ra-core";
import type * as React from "react";

type BadgeProps = React.ComponentProps<typeof Badge>;

export const BadgeField = <RecordType extends RaRecord = RaRecord>({
  defaultValue,
  source,
  record,
  empty,
  variant = "outline",
  ...rest
}: BadgeFieldProps<RecordType>) => {
  const value = useFieldValue({ defaultValue, source, record });
  const translate = useTranslate();

  if (value == null) {
    return empty && typeof empty === "string" ? translate(empty, { _: empty }) : empty;
  }

  return (
    <Badge variant={variant} {...rest}>
      {typeof value !== "string" ? value.toString() : value}
    </Badge>
  );
};

export interface BadgeFieldProps<RecordType extends RaRecord = RaRecord> extends FieldProps<RecordType>, BadgeProps {
  variant?: "default" | "outline" | "secondary" | "destructive";
}
