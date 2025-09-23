import { BulkDeleteButton } from "@/shared/components/admin/bulk-delete-button";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { X } from "lucide-react";
import { Translate, useListContext } from "ra-core";
import type { ReactNode } from "react";
import { BulkExportButton } from "./bulk-export-button";

export function BulkActionsToolbarChildren() {
  return (
    <>
      <BulkExportButton />
      <BulkDeleteButton />
    </>
  );
}

export const BulkActionsToolbar = ({
  children = <BulkActionsToolbarChildren />,
}: {
  children?: ReactNode;
}) => {
  const { selectedIds, onUnselectItems } = useListContext();
  if (!selectedIds?.length) {
    return null;
  }
  const handleUnselectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUnselectItems();
  };
  return (
    <Card className="flex flex-col gap-2 md:gap-6 md:flex-row items-stretch sm:items-center p-2 px-4 w-[90%] sm:w-fit mx-auto fixed bottom-2 left-0 right-0 z-10 bg-zinc-100 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="has-[>svg]:px-0" onClick={handleUnselectAll}>
          <X />
        </Button>
        <span className="text-sm text-muted-foreground">
          <Translate i18nKey="ra.action.bulk_actions" options={{ smart_count: selectedIds.length }}>
            {selectedIds.length} rows selected
          </Translate>
        </span>
      </div>
      {children}
    </Card>
  );
};
