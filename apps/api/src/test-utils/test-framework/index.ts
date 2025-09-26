import { ApiContext } from "@/api-lib/context";
import { getLogger } from "@/utils/logger";
import { faker } from "@faker-js/faker";

export interface TestHeaders extends Record<string, string | undefined> {
  // test- prefix are test-specific headers
  "test-user-id"?: string;
  "test-logging-enabled"?: string;
}

export interface TestFacets {
  headers: TestHeaders;
}

export interface TestFacetParams {
  /**
   * Enables endpoint-level logging for the test by adding a test-specific header
   * to tell the server to enable logging.
   *
   * You can also use "request.log.enableLogging();" in the endpoint impl code
   * itself to enable logging during tests.
   */
  withLogging?: boolean;
}

export class ApiTestingFramework {
  context: ApiContext;

  constructor() {
    this.context = new ApiContext({
      log: getLogger(),
    });
  }

  /**
   * Generates a set of test facets that can be used to test the API.
   */
  async generateTestFacets(params?: TestFacetParams): Promise<TestFacets> {
    return {
      headers: this.generateTestHeaders(params),
    };
  }

  private generateTestHeaders(params?: TestFacetParams): TestHeaders {
    return {
      "test-user-id": faker.string.uuid(),
      ...(params?.withLogging ? { "test-logging-enabled": "true" } : { "test-logging-enabled": "false" }),
    };
  }
}

export const testFramework: ApiTestingFramework = new ApiTestingFramework();
