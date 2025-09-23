import { buttonVariants } from "@/shared/components/ui/button";
import { Pencil } from "lucide-react";
import { type RaRecord, Translate, useCreatePath, useRecordContext, useResourceContext } from "ra-core";
import type React from "react";
import { Link } from "react-router";

export type EditButtonProps = {
  record?: RaRecord;
  resource?: string;
  label?: string;
};

export const EditButton = (props: EditButtonProps) => {
  const resource = useResourceContext(props);
  const record = useRecordContext(props);
  const createPath = useCreatePath();
  const link = createPath({
    resource,
    type: "edit",
    id: record?.id,
  });
  return (
    <Link className={buttonVariants({ variant: "outline" })} to={link} onClick={stopPropagation}>
      <Pencil />
      <Translate i18nKey={props.label ?? "ra.action.edit"}>{props.label ?? "Edit"}</Translate>
    </Link>
  );
};

// useful to prevent click bubbling in a datagrid with rowClick
const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
