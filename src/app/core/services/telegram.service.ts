import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class TelegramService {

  private window: any;
  public tg: any;

  constructor(@Inject(DOCUMENT) private _document: any) {
    this.window = this._document.defaultView;
    this.tg = this.window.Telegram.WebApp;
  }

  public getTelegramUser(): User | null {
    const isLocal = window.location.hostname === 'localhost';
    const isGHPage = window.location.hostname.includes('github.io');
    const isNotTelegram = !this.tg?.initDataUnsafe?.user;

    if ((isLocal || isGHPage) && isNotTelegram) {
      return this.getTestUser();
    }

    const tgUser = this.tg?.initDataUnsafe?.user;

    if (!tgUser) return null;

    return {
      userId: tgUser.id,
      username: tgUser.username,
      userfirstname: tgUser.first_name,
      userlastname: tgUser.last_name
    };
  }

  public getTestUser(): User | null {
    const me = {
      userId: 784002330,
      username: "alex_gervas",
      userfirstname: "Alexandra",
      userlastname: "Gervas 🎸"
    }; 
    return me;
  }
}
