export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'provider' | 'customer';
}

export interface AuthResponse {
  accessToken: string;
  data: User;
}
