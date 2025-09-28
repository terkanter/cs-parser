export interface BuyRequestQuery {
  price?: { gte?: number; lte?: number };
  float?: { gte?: number; lte?: number };
  paint_seed?: Array<{ value?: number; tier?: number }>;
  item: string;
}
