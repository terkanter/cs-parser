// RabbitMQ Queue and Exchange Constants

export const QUEUES = {
  TELEGRAM_NOTIFICATIONS: "telegram.notifications",
  PARSER_REQUESTS: "parser.requests",
  ITEM_FOUND: "item.found",
} as const;

export const EXCHANGES = {
  NOTIFICATIONS: "notifications",
  PARSER: "parser",
  ITEMS_FOUND: "items.found", // Legacy exchange name for backwards compatibility
} as const;

export const ROUTING_KEYS = {
  TELEGRAM_NOTIFY: "telegram.notify",
  ITEM_FOUND: "item.found",
  PARSE_REQUEST: "parse.request",
} as const;

// Topic names for different message types
export const TOPICS = {
  BUY_REQUEST_CREATED: "buy_request.created",
  BUY_REQUEST_UPDATED: "buy_request.updated",
  BUY_REQUEST_DELETED: "buy_request.deleted",
  ITEM_FOUND: "item.found",
  USER_NOTIFICATION: "user.notification",
} as const;

// Message types
export interface FoundItemMessage {
  buyRequestId: string;
  userId: string;
  platform: string;
  item: {
    name: string;
    price: number;
    float: number;
    paintSeed: number;
    paintSeedTier?: number;
    quality: string;
    url: string;
    imageUrl?: string;
  };
  foundAt: Date;
}

// Type exports for type safety
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
export type ExchangeName = (typeof EXCHANGES)[keyof typeof EXCHANGES];
export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];
export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];
