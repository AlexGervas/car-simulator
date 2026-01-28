export interface User {
  userId: number;
  isTelegram: boolean;
  username?: string;
  userfirstname: string;
  userlastname: string;
  email?: string;
  password_plain?: string;
  telegram_id?: string | null;
  telegram_username?: string | null;
  telegram_auth_date?: string | null;
  telegram_hash?: string | null;
}

export interface CreateUserResponse {
  id?: number;
  username?: string;
}

export interface CompleteLevelResponse {
  success: boolean;
  message?: string;
}

export interface LoginResponse {
  token: string;
}

export interface DialogData {
  showButtons: boolean;
  title: string;
  message: string;
}

export interface TelegramLoginResponse {
  token: string;
  user: User;
}

export interface TelegramWebApp {
  initDataUnsafe?: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

export interface TelegramAuthEvent extends Event {
  detail: {
    id: number;
    username?: string;
    auth_date: number;
    hash: string;
    first_name?: string;
    last_name?: string;
  };
}
