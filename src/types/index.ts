export enum ErrorCode {
  API_KEY_NOT_FOUND = 'apiKey_not_found',
  DB_ERROR = 'db_error',
  CACHE_ERROR = 'cache_error',
  INVALID_PAYLOAD = 'invalid_payload',
}

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
  };
}

export interface Permission {
  module: string;
  action: string;
}

export interface GrantRequest {
  apiKey: string;
  module: string;
  action: string;
}

export interface RevokeRequest {
  apiKey: string;
  module: string;
  action: string;
}

export interface CheckRequest {
  apiKey: string;
  module: string;
  action: string;
}

export interface ListRequest {
  apiKey: string;
}

export interface GrantResponse {
  status: 'ok';
}

export interface RevokeResponse {
  status: 'ok';
}

export interface CheckResponse {
  allowed: boolean;
}

export interface ListResponse {
  permissions: Permission[];
}