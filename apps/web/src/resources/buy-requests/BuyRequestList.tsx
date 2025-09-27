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

const PlatformColumn = ({ record }: { record?: any }) => {
  if (!record) return null;

  const platformLabels: Record<string, string> = {
    LIS_SKINS: "Lis Skins",
    CS_MONEY: "CS Money",
  };

  return <div className="font-bold">{platformLabels[record.platform] || record.platform}</div>;
};

const FloatsColumn = ({ record }: { record?: any }) => {
  if (!record?.query) return <span className="text-muted-foreground">No filters</span>;

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
      return floatRanges.map((float: string) => (
        <Badge key={float} variant="outline">
          {float}
        </Badge>
      ));
    }
  }

  return <span className="text-muted-foreground">No filters</span>;
};

const PricesColumn = ({ record }: { record?: any }) => {
  if (!record?.query) return <span className="text-muted-foreground">No filters</span>;

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
      return priceRanges.map((price: string) => (
        <Badge key={price} variant="outline">
          {price}
        </Badge>
      ));
    }
  }

  return <span className="text-muted-foreground">No filters</span>;
};

const QualityColumn = ({ record }: { record?: any }) => {
  if (!record?.query) return <span className="text-muted-foreground">No filters</span>;

  if (record.query.quality?.length) {
    return record.query.quality.map((quality: string) => (
      <Badge key={quality} variant="outline">
        {quality}
      </Badge>
    ));
  }

  return <span className="text-muted-foreground">No filters</span>;
};

const ItemsColumn = ({ record }: { record?: any }) => {
  if (!record?.query) return <span className="text-muted-foreground">No filters</span>;

  const queryParts = [];

  if (record.query.item?.length) {
    queryParts.push(`${record.query.item.join(", ")}`);
  }

  if (record.query.quality?.length) {
    return record.query.item.map((item: string) => (
      <Badge key={item} variant="outline">
        {item}
      </Badge>
    ));
  }

  return <span className="text-muted-foreground">No filters</span>;
};

const BooleanColumn = ({ record, ...rest }: { record?: any }) => {
  if (!record || record.isActive === undefined) return null;

  return <Badge variant={record.isActive ? "secondary" : "destructive"}>{record.isActive ? "Yes" : "No"}</Badge>;
};

export const BuyRequestList = () => (
  <List filters={BuyRequestFilter} perPage={25}>
    <DataTable hasBulkActions={false} sort={{ field: "createdAt", order: "DESC" }}>
      <DataTable.Col source="query" label="Items" render={(record) => <ItemsColumn record={record} />} />
      <DataTable.Col source="query" label="Prices" render={(record) => <PricesColumn record={record} />} />
      <DataTable.Col source="query" label="Floats" render={(record) => <FloatsColumn record={record} />} />
      <DataTable.Col source="query" label="Quality" render={(record) => <QualityColumn record={record} />} />
      <DataTable.Col source="platform" label="Platform" render={(record) => <PlatformColumn record={record} />} />
      <DataTable.Col source="isActive" label="Active" render={(record) => <BooleanColumn record={record} />} />
    </DataTable>
  </List>
);
