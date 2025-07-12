import { connect, JSONCodec } from "nats";
import {
  GrantRequest,
  RevokeRequest,
  CheckRequest,
  ListRequest,
  GrantResponse,
  RevokeResponse,
  CheckResponse,
  ListResponse,
  ErrorResponse,
} from "../types";

const jc = JSONCodec();

export class NatsClient {
  private nc: any;

  async connect(url: string) {
    try {
      this.nc = await connect({ servers: url });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to connect to NATS: ${errorMessage}`);
    }
  }

  async grant(request: GrantRequest): Promise<GrantResponse | ErrorResponse> {
    const response = await this.nc.request(
      "permissions.grant",
      jc.encode(request)
    );
    return jc.decode(response.data) as GrantResponse | ErrorResponse;
  }

  async revoke(
    request: RevokeRequest
  ): Promise<RevokeResponse | ErrorResponse> {
    const response = await this.nc.request(
      "permissions.revoke",
      jc.encode(request)
    );
    return jc.decode(response.data) as RevokeResponse | ErrorResponse;
  }

  async check(request: CheckRequest): Promise<CheckResponse | ErrorResponse> {
    const response = await this.nc.request(
      "permissions.check",
      jc.encode(request)
    );
    return jc.decode(response.data) as CheckResponse | ErrorResponse;
  }

  async list(request: ListRequest): Promise<ListResponse | ErrorResponse> {
    const response = await this.nc.request(
      "permissions.list",
      jc.encode(request)
    );
    return jc.decode(response.data) as ListResponse | ErrorResponse;
  }

  async close() {
    if (this.nc) {
      await this.nc.drain();
      await this.nc.close();
    }
  }
}

export const natsClient = new NatsClient();
