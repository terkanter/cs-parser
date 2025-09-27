import { DateField, DeleteButton, EditButton, Show, SimpleShowLayout } from "@/shared/components/admin";
import { Badge } from "@/shared/components/ui/badge";
import { CardTitle } from "@/shared/components/ui/card";
import { useRecordContext } from "ra-core";

type BuyRequest = {
  platform: string;
  isActive: boolean;
  query: {
    item: string[];
    quality: string[];
    price: { gte: number; lte: number }[];
    float: { gte: number; lte: number }[];
    paint_seed: { gte: number; lte: number }[];
  };
};

const BuyRequestShowActions = () => (
  <div className="flex items-center gap-2">
    <EditButton />
    <DeleteButton />
  </div>
);

const PlatformShowField = () => {
  const record = useRecordContext<BuyRequest>();

  if (!record) return null;

  const platformLabels: Record<string, string> = {
    LIS_SKINS: "Lis Skins",
    CS_MONEY: "CS Money",
  };

  return (
    <Badge variant={record.platform === "LIS_SKINS" ? "default" : "secondary"}>
      {platformLabels[record.platform] || record.platform}
    </Badge>
  );
};

const QueryShowField = () => {
  const record = useRecordContext<BuyRequest>();

  if (!record || !record.query) return <span className="text-muted-foreground">No query defined</span>;

  const { query } = record;

  return (
    <div className="grid grid-cols-2 gap-8 max-w-xl">
      {/* Items */}
      {query.item?.length > 0 && (
        <div className="space-y-2">
          <CardTitle className="text-sm">Items</CardTitle>
          <div className="flex flex-wrap gap-1">
            {query.item.map((item: string) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Quality */}
      {query.quality?.length > 0 && (
        <div className="space-y-2">
          <CardTitle className="text-sm">Quality</CardTitle>
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1">
              {query.quality.map((q: string) => (
                <Badge key={q} variant="secondary">
                  {q}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Price Ranges */}
      {query.price?.length > 0 && (
        <div className="space-y-2">
          <CardTitle className="text-sm">Price Ranges</CardTitle>
          <div className="space-y-1">
            {query.price.map((price: any, priceIndex: number) => (
              <div key={`price-${priceIndex}`} className="text-sm">
                {price.gte && price.lte
                  ? `$${price.gte} - $${price.lte}`
                  : price.gte
                    ? `≥ $${price.gte}`
                    : price.lte
                      ? `≤ $${price.lte}`
                      : "Any price"}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Float Ranges */}
      {query.float?.length > 0 && (
        <div className="space-y-2">
          <CardTitle className="text-sm">Float Ranges</CardTitle>
          <div className="space-y-1">
            {query.float.map((float: any, floatIndex: number) => (
              <div key={`float-${floatIndex}`} className="text-sm">
                {float.gte && float.lte
                  ? `${float.gte} - ${float.lte}`
                  : float.gte
                    ? `≥ ${float.gte}`
                    : float.lte
                      ? `≤ ${float.lte}`
                      : "Any float"}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paint Seed Ranges */}
      {query.paint_seed?.length > 0 && (
        <div className="space-y-2">
          <CardTitle className="text-sm">Paint Seed Ranges</CardTitle>
          <div className="space-y-1">
            {query.paint_seed.map((seed: any, seedIndex: number) => (
              <div key={`seed-${seedIndex}`} className="text-sm">
                {seed.gte && seed.lte
                  ? `${seed.gte} - ${seed.lte}`
                  : seed.gte
                    ? `≥ ${seed.gte}`
                    : seed.lte
                      ? `≤ ${seed.lte}`
                      : "Any paint seed"}
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
          <div className="flex flex-row gap-4">
            <div>
              <div className="text-sm font-medium">Platform</div>
              <PlatformShowField />
            </div>
            <div>
              <div className="text-sm font-medium">Status</div>
              <BooleanShowField />
            </div>
          </div>

          <div className="flex flex-row gap-4">
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
        {/* Query Details */}
        <div className="space-y-6">
          <CardTitle>Search Query</CardTitle>
          <QueryShowField />
        </div>
      </div>
    </SimpleShowLayout>
  </Show>
);
