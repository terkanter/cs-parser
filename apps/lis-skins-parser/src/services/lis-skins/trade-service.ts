import { LIS_SKINS_API_URL } from "../../consts";
import type { PlatformAccountRepository, UserRepository } from "../../repositories";
import { logger } from "../../utils/logger";

export interface TradeResult {
  success: boolean;
  message: string;
  transactionId?: string;
}

export interface ITradeService {
  buyItem(userId: string, itemId: number, price: number): Promise<TradeResult>;
  checkBalance(userId: string): Promise<number | null>;
}

export class LisSkinsTradeService implements ITradeService {
  constructor(
    private platformAccountRepository: PlatformAccountRepository,
    private userRepository: UserRepository,
  ) {}

  async buyItem(userId: string, itemId: number, price: number): Promise<TradeResult> {
    try {
      // Get user's API key
      const auth = await this.platformAccountRepository.findLisSkinsAccountByUserId(userId);
      if (!auth) {
        return {
          success: false,
          message: "Не найдена авторизация для LIS-Skins",
        };
      }

      const apiKey = (auth.credentials as { apiKey: string }).apiKey;

      // Check balance
      const balance = await this.fetchBalance(apiKey);
      if (balance === null) {
        return {
          success: false,
          message: "Не удалось проверить баланс",
        };
      }

      if (balance < price) {
        return {
          success: false,
          message: `Недостаточно средств на балансе. Текущий баланс: $${balance.toFixed(2)}`,
        };
      }

      // Get user's trade URL
      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        return {
          success: false,
          message: "Не найден пользователь",
        };
      }

      if (!user.steamTradeUrl) {
        return {
          success: false,
          message: "Не найден Steam Trade URL. Пожалуйста, добавьте его в настройках.",
        };
      }

      // Parse trade URL
      const tradeUrlParams = this.parseTradeUrl(user.steamTradeUrl);
      if (!tradeUrlParams) {
        return {
          success: false,
          message: "Неверный формат Steam Trade URL",
        };
      }

      // Execute purchase
      const purchaseResult = await this.executePurchase(apiKey, itemId, tradeUrlParams.partner, tradeUrlParams.token);

      if (purchaseResult.success) {
        logger
          .withContext({
            itemId,
            userId,
            price,
            transactionId: purchaseResult.transactionId,
          })
          .info(`Successfully purchased item ${itemId} for user ${userId}`);
      }

      return purchaseResult;
    } catch (error) {
      logger.withContext({ userId, itemId, price }).withError(error).error("Error buying item");
      return {
        success: false,
        message: "Произошла ошибка при покупке. Попробуйте позже.",
      };
    }
  }

  async checkBalance(userId: string): Promise<number | null> {
    try {
      const auth = await this.platformAccountRepository.findLisSkinsAccountByUserId(userId);
      if (!auth) {
        return null;
      }

      const apiKey = (auth.credentials as { apiKey: string }).apiKey;
      return await this.fetchBalance(apiKey);
    } catch (error) {
      logger.withContext({ userId }).withError(error).error("Error checking balance");
      return null;
    }
  }

  private async fetchBalance(apiKey: string): Promise<number | null> {
    try {
      const response = await fetch(`${LIS_SKINS_API_URL}user/balance`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        logger.error(`Failed to fetch balance: ${response.status} ${response.statusText}`);
        return null;
      }

      const json = (await response.json()) as { data: { balance: number } };
      return json.data.balance;
    } catch (error) {
      logger.withError(error).error("Failed to fetch balance from API");
      return null;
    }
  }

  private parseTradeUrl(tradeUrl: string): { partner: string; token: string } | null {
    try {
      const url = new URL(tradeUrl);
      const partner = url.searchParams.get("partner");
      const token = url.searchParams.get("token");

      if (!partner || !token) {
        return null;
      }

      return { partner, token };
    } catch (error) {
      logger.withError(error).error("Failed to parse trade URL");
      return null;
    }
  }

  private async executePurchase(apiKey: string, itemId: number, partner: string, token: string): Promise<TradeResult> {
    try {
      const response = await fetch(`${LIS_SKINS_API_URL}market/buy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: [itemId],
          partner,
          token,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        // Try to parse error message
        try {
          const errorData = JSON.parse(responseText);
          return {
            success: false,
            message: errorData.message || `Ошибка API: ${response.status}`,
          };
        } catch {
          return {
            success: false,
            message: `Не удалось купить предмет: ${responseText}`,
          };
        }
      }

      // Parse success response
      try {
        const successData = JSON.parse(responseText);
        return {
          success: true,
          message: "Предмет успешно куплен! Проверьте Steam для подтверждения обмена.",
          transactionId: successData.data?.transaction_id,
        };
      } catch {
        // If we can't parse but status is OK, assume success
        return {
          success: true,
          message: "Предмет успешно куплен!",
        };
      }
    } catch (error) {
      logger.withError(error).error("Failed to execute purchase");
      return {
        success: false,
        message: "Ошибка при выполнении покупки",
      };
    }
  }
}
