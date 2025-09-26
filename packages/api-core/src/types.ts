export interface BuyRequestQuery {
  price?: Array<{ gte?: number; lte?: number }>;
  float?: Array<{ gte?: number; lte?: number }>;
  paint_seed?: Array<{ gte?: number; lte?: number }>;
  item?: string[];
  quality?: string[];
}
