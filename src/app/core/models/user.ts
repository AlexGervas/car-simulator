export interface User {
    userId: number;
    isTelegram: boolean;
    username: string;
    userfirstname: string;
    userlastname: string;
    email?: string;
    password_hash?: string;
}