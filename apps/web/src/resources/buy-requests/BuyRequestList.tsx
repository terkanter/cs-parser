import { BooleanInput, DataTable, List } from "@/shared/components/admin";
import { Badge } from "@/shared/components/ui/badge";

const BuyRequestFilter = [
  // <SearchInput key="search" source="q" alwaysOn />,
  // <SelectInput
  //   key="platform"
  //   source="platform"
  //   choices={[
  //     { id: "LIS_SKINS", name: "Lis Skins" },
  //     { id: "CS_MONEY", name: "CS Money" },
  //   ]}
  // />,
  <BooleanInput key="isActive" source="isActive" />,
];

const FloatRangeColumn = ({ record }: { record?: any }) => {
  if (!record?.query?.float) return <span className="text-muted-foreground">No filter</span>;

  const floatRange = record.query.float;
  if (floatRange.gte && floatRange.lte) return `${floatRange.gte}-${floatRange.lte}`;
  if (floatRange.gte) return `≥${floatRange.gte}`;
  if (floatRange.lte) return `≤${floatRange.lte}`;
  return "";
};

const PriceRangeColumn = ({ record }: { record?: any }) => {
  if (!record?.query?.price) return <span className="text-muted-foreground">No filter</span>;

  const priceRange = record.query.price;

  if (priceRange.gte && priceRange.lte) return `$${priceRange.gte}-$${priceRange.lte}`;
  if (priceRange.gte) return `≥$${priceRange.gte}`;
  if (priceRange.lte) return `≤$${priceRange.lte}`;
  return "";
};

const ItemColumn = ({ record }: { record?: any }) => {
  if (!record?.query?.item) return <span className="text-muted-foreground">No filter</span>;

  return record.query.item;
};

const BooleanColumn = ({ record }: { record?: any }) => {
  if (!record || record.isActive === undefined) return null;

  return <Badge variant={record.isActive ? "secondary" : "destructive"}>{record.isActive ? "Yes" : "No"}</Badge>;
};

export const BuyRequestList = () => (
  <List filters={BuyRequestFilter} perPage={25}>
    <DataTable hasBulkActions={false} sort={{ field: "createdAt", order: "DESC" }}>
      <DataTable.Col source="query" label="Item" render={(record) => <ItemColumn record={record} />} />
      <DataTable.Col source="query" label="Price" render={(record) => <PriceRangeColumn record={record} />} />
      <DataTable.Col source="query" label="Float" render={(record) => <FloatRangeColumn record={record} />} />
      <DataTable.Col source="isActive" label="Active" render={(record) => <BooleanColumn record={record} />} />
    </DataTable>
  </List>
);
