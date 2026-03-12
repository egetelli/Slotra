export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'provider' | 'client';
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
