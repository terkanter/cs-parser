import { DateField, DeleteButton, EditButton, Show, SimpleShowLayout, TextField } from "@/shared/components/admin";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

const BuyRequestShowActions = () => (
  <div className="flex items-center gap-2">
    <EditButton />
    <DeleteButton />
  </div>
);

const PlatformShowField = ({ record }: { record?: any }) => {
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

const QueryShowField = ({ record }: { record?: any }) => {
  if (!record?.query) return <span className="text-muted-foreground">No query defined</span>;

  const { query } = record;

  return (
    <div className="space-y-4">
      {/* Items */}
      {query.item?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {query.item.map((item: string) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality */}
      {query.quality?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {query.quality.map((q: string) => (
                <Badge key={q} variant="secondary">
                  {q}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Ranges */}
      {query.price?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Price Ranges</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Float Ranges */}
      {query.float?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Float Ranges</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Paint Seed Ranges */}
      {query.paint_seed?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Paint Seed Ranges</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const BooleanShowField = ({ record }: { record?: any }) => {
  if (!record || record.isActive === undefined) return null;

  return <Badge variant={record.isActive ? "default" : "secondary"}>{record.isActive ? "Active" : "Inactive"}</Badge>;
};

export const BuyRequestShow = () => (
  <Show actions={<BuyRequestShowActions />}>
    <SimpleShowLayout>
      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">ID</div>
              <TextField source="id" />
            </div>
            <div>
              <div className="text-sm font-medium">Platform</div>
              <PlatformShowField />
            </div>
            <div>
              <div className="text-sm font-medium">Status</div>
              <BooleanShowField />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium">Created</div>
                <DateField source="createdAt" />
              </div>
              <div>
                <div className="text-sm font-medium">Updated</div>
                <DateField source="updatedAt" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Query Details */}
        <Card>
          <CardHeader>
            <CardTitle>Search Query</CardTitle>
          </CardHeader>
          <CardContent>
            <QueryShowField />
          </CardContent>
        </Card>
      </div>
    </SimpleShowLayout>
  </Show>
);
