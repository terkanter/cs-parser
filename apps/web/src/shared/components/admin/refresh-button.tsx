import { Button } from "@/shared/components/ui/button";
import { LoaderCircle, RotateCw } from "lucide-react";
import { useLoading, useRefresh } from "ra-core";

export const RefreshButton = () => {
  const refresh = useRefresh();
  const loading = useLoading();

  const handleRefresh = () => {
    refresh();
  };

  return (
    <Button onClick={handleRefresh} variant="ghost" size="icon" className="hidden sm:inline-flex">
      {loading ? <LoaderCircle className="animate-spin" /> : <RotateCw />}
    </Button>
  );
};
