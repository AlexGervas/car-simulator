export {};

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramInitDataUnsafe {
  user?: TelegramUser;
  auth_date?: number;
  hash?: string;
  query_id?: string;
  start_param?: string;
}

interface TelegramCloudStorageError {
  message?: string;
  code?: string;
}

type TelegramCloudStorageCallback<T> = (
  err: TelegramCloudStorageError | null,
  value: T
) => void;
type TelegramCloudStorageGetKeysCallback = (
  err: TelegramCloudStorageError | null,
  keys: string[]
) => void;

interface TelegramCloudStorage {
  setItem: (
    key: string,
    value: string,
    callback?: (err?: TelegramCloudStorageError) => void
  ) => void;
  getItem: (
    key: string,
    callback: TelegramCloudStorageCallback<string>
  ) => void;
  removeItem: (
    key: string,
    callback?: (err?: TelegramCloudStorageError) => void
  ) => void;
  getKeys?: (callback: TelegramCloudStorageGetKeysCallback) => void;
}

interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: TelegramInitDataUnsafe;
  version?: string;
  platform?: string;
  isExpanded?: boolean;
  isClosingConfirmationEnabled?: boolean;
  CloudStorage?: TelegramCloudStorage;
  expand?: () => void;
  close?: () => void;
  sendData?: (data: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}
