import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { TelegramWebApp, User } from '../models/types';

@Injectable({
  providedIn: 'root',
})
export class TelegramService {
  private window: Window | null;
  public tg: TelegramWebApp | undefined;

  constructor(@Inject(DOCUMENT) private _document: Document) {
    this.window = this._document.defaultView;
    this.tg = this.window?.Telegram?.WebApp;
  }

  /** true, если приложение открыто внутри Telegram WebApp */
  public isTelegramEnv(): boolean {
    return !!this.tg?.initDataUnsafe?.user;
  }

  /** Возвращает юзера из Telegram-профиля (или null, если не Telegram) */
  public getTelegramUser(): User | null {
    const tgUser = this.tg?.initDataUnsafe?.user;

    if (!tgUser) return null;

    return {
      userId: tgUser.id,
      isTelegram: true,
      username: tgUser.username ?? '',
      userfirstname: tgUser.first_name ?? '',
      userlastname: tgUser.last_name ?? '',
      email: '',
      password_plain: '',
    };
  }
}
