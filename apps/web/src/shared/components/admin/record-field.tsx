import { cn } from "@/shared/lib/utils";
import {
  type ExtractRecordPaths,
  FieldTitle,
  type HintedString,
  useRecordContext,
  useResourceContext,
  useTranslate,
} from "ra-core";
import { type ElementType, type HTMLAttributes, type ReactNode, createElement } from "react";

import { TextField } from "@/shared/components/admin/text-field";

export const RecordField = <RecordType extends Record<string, any> = Record<string, any>>(
  props: RecordFieldProps<RecordType>,
) => {
  const {
    children,
    className,
    empty,
    field,
    label,
    render,
    resource: _,
    source,
    record: recordProp,
    variant,
    ...rest
  } = props;
  const resource = useResourceContext(props);
  const record = useRecordContext<RecordType>({ recordProp });
  const translate = useTranslate();

  if (!source && !label && !render) return null;

  return (
    <div className={cn(className, "flex", variant === "inline" ? "flex-row" : "flex-col")} {...rest}>
      {label !== "" && label !== false ? (
        <div className={cn(variant === "inline" ? "block min-w-50" : "text-xs", "text-muted-foreground")}>
          <FieldTitle label={label} source={source} resource={resource} isRequired={false} />
        </div>
      ) : null}
      {children ? (
        <span className="flex-1">{children}</span>
      ) : render ? (
        record && (
          <span className="flex-1">
            {render(record) || (typeof empty === "string" ? translate(empty, { _: empty }) : empty)}
          </span>
        )
      ) : field ? (
        createElement(field, {
          source,
          empty,
          className: "flex-1",
        })
      ) : source ? (
        <TextField source={source} empty={empty} className="flex-1" />
      ) : null}
    </div>
  );
};

// FIXME remove custom type when using TypeScript >= 5.4 as it is now native
type NoInfer<T> = T extends infer U ? U : never;

export interface RecordFieldProps<RecordType extends Record<string, any> = Record<string, any>>
  extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
  empty?: ReactNode;
  field?: ElementType;
  label?: ReactNode;
  render?: (record: RecordType) => React.ReactNode;
  resource?: string;
  source?: NoInfer<HintedString<ExtractRecordPaths<RecordType>>>;
  record?: RecordType;
  variant?: "default" | "inline";
}
