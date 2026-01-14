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
