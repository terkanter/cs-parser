import { BooleanInput, DataTable, DateField, List, TextField } from "@/shared/components/admin";
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

const PlatformColumn = ({ record }: { record?: any }) => {
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

const QueryColumn = ({ record }: { record?: any }) => {
  if (!record?.query) return <span className="text-muted-foreground">No filters</span>;

  const queryParts = [];

  if (record.query.item?.length) {
    queryParts.push(`Items: ${record.query.item.join(", ")}`);
  }

  if (record.query.quality?.length) {
    queryParts.push(`Quality: ${record.query.quality.join(", ")}`);
  }

  if (record.query.price?.length) {
    const priceRanges = record.query.price
      .map((p: any) => {
        if (p.gte && p.lte) return `$${p.gte}-$${p.lte}`;
        if (p.gte) return `≥$${p.gte}`;
        if (p.lte) return `≤$${p.lte}`;
        return "";
      })
      .filter(Boolean);
    if (priceRanges.length) {
      queryParts.push(`Price: ${priceRanges.join(", ")}`);
    }
  }

  if (record.query.float?.length) {
    const floatRanges = record.query.float
      .map((f: any) => {
        if (f.gte && f.lte) return `${f.gte}-${f.lte}`;
        if (f.gte) return `≥${f.gte}`;
        if (f.lte) return `≤${f.lte}`;
        return "";
      })
      .filter(Boolean);
    if (floatRanges.length) {
      queryParts.push(`Float: ${floatRanges.join(", ")}`);
    }
  }

  return queryParts.length > 0 ? (
    <div className="text-sm space-y-1">
      {queryParts.map((part) => (
        <div key={part} className="text-muted-foreground">
          {part}
        </div>
      ))}
    </div>
  ) : (
    <span className="text-muted-foreground">No filters</span>
  );
};

const BooleanColumn = ({ record }: { record?: any }) => {
  if (!record || record.isActive === undefined) return null;

  return <Badge variant={record.isActive ? "default" : "secondary"}>{record.isActive ? "Active" : "Inactive"}</Badge>;
};

export const BuyRequestList = () => (
  <List filters={BuyRequestFilter} perPage={25} sort={{ field: "createdAt", order: "DESC" }}>
    <DataTable>
      <DataTable.Col source="id">
        <TextField source="id" />
      </DataTable.Col>

      <DataTable.Col source="platform" label="Platform">
        <PlatformColumn />
      </DataTable.Col>

      <DataTable.Col source="query" label="Query">
        <QueryColumn />
      </DataTable.Col>

      <DataTable.Col source="isActive" label="Active">
        <BooleanColumn />
      </DataTable.Col>

      <DataTable.Col source="createdAt" label="Created">
        <DateField source="createdAt" />
      </DataTable.Col>

      <DataTable.Col source="updatedAt" label="Updated">
        <DateField source="updatedAt" />
      </DataTable.Col>
    </DataTable>
  </List>
);
