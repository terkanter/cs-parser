import { DateField, DeleteButton, EditButton, Show, SimpleShowLayout } from "@/shared/components/admin";
import { Badge } from "@/shared/components/ui/badge";
import { CardTitle } from "@/shared/components/ui/card";
import { useRecordContext } from "ra-core";

type BuyRequest = {
  isActive: boolean;
  query: {
    item: string;
    price: { gte: number; lte: number };
    float: { gte: number; lte: number };
    paint_seed: { name: string; value: number[] }[];
  };
};

const BuyRequestShowActions = () => (
  <div className="flex items-center gap-2">
    <EditButton />
    <DeleteButton />
  </div>
);

const QueryShowField = () => {
  const record = useRecordContext<BuyRequest>();

  if (!record || !record.query) return <span className="text-muted-foreground">No query defined</span>;

  const { query } = record;

  return (
    <div className="grid grid-cols-2 gap-8 max-w-xl">
      <div className="space-y-2 col-span-2">
        <CardTitle className="text-lg">Item</CardTitle>
        <div className="space-y-1">{query.item}</div>
      </div>

      {/* Price Ranges */}
      {query.price && (
        <div className="space-y-2">
          <CardTitle className="text-lg">Price</CardTitle>
          <div className="space-y-1">
            {query.price.gte && query.price.lte
              ? `$${query.price.gte} - $${query.price.lte}`
              : query.price.gte
                ? `≥ $${query.price.gte}`
                : query.price.lte
                  ? `≤ $${query.price.lte}`
                  : "Any price"}
          </div>
        </div>
      )}

      {/* Float Ranges */}
      {query.float && (
        <div className="space-y-2">
          <CardTitle className="text-lg">Float</CardTitle>
          <div className="space-y-1">
            {query.float.gte && query.float.lte
              ? `${query.float.gte} - ${query.float.lte}`
              : query.float.gte
                ? `≥ ${query.float.gte}`
                : query.float.lte
                  ? `≤ ${query.float.lte}`
                  : "Any float"}
          </div>
        </div>
      )}

      {query.paint_seed?.length > 0 && (
        <div className="space-y-2 col-span-2">
          <CardTitle className="text-lg">Paint Seeds</CardTitle>
          <div className="space-y-1">
            {query.paint_seed
              .filter((seed: { name: string; value: number[] }) => seed.name && seed.value)
              .map((seed: { name: string; value: number[] }) => (
                <div
                  key={`seed-${seed.name}-${seed.value.join(", ")}`}
                  className="text-sm gap-4 flex flex-col border p-4"
                >
                  <div className="font-bold text-md">{seed.name}</div>
                  <div>{seed.value.join(", ")}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

const BooleanShowField = () => {
  const record = useRecordContext<BuyRequest>();

  if (!record || record.isActive === undefined) return null;

  return <Badge variant={record.isActive ? "default" : "secondary"}>{record.isActive ? "Active" : "Inactive"}</Badge>;
};

export const BuyRequestShow = () => (
  <Show actions={<BuyRequestShowActions />}>
    <SimpleShowLayout>
      <div className="space-y-12">
        {/* Basic Information */}
        <div className="space-y-6">
          <div className="flex flex-row gap-8">
            <div>
              <div className="text-sm font-medium">Status</div>
              <BooleanShowField />
            </div>
            <div>
              <div className="text-sm font-medium">Created</div>
              <DateField source="createdAt" className="text-xs" />
            </div>
            <div>
              <div className="text-sm font-medium">Updated</div>
              <DateField source="updatedAt" className="text-xs" />
            </div>
          </div>
        </div>
        <QueryShowField />
      </div>
    </SimpleShowLayout>
  </Show>
);
