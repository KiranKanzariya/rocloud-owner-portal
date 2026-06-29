export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  mobile: string;
  planType: string;
  subdomain?: string;
}

export interface RegisterGoogleRequest {
  idToken: string;
  businessName: string;
  mobile?: string;
  planType: string;
  subdomain?: string;
}
