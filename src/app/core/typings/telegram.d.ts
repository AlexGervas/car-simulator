export { };

declare global {
    interface Window {
        Telegram?: {
            WebApp?: {
                initData?: string;
                initDataUnsafe?: any;
                version?: string;
                platform?: string;
                isExpanded?: boolean;
                isClosingConfirmationEnabled?: boolean;
                CloudStorage?: {
                    setItem: (key: string, value: string, callback?: () => void) => void;
                    getItem: (key: string, callback: (err: any, value: string) => void) => void;
                    removeItem: (key: string, callback?: () => void) => void;
                    getKeys?: (callback: (err: any, keys: string[]) => void) => void;
                };
                expand?: () => void;
                close?: () => void;
                sendData?: (data: string) => void;
            };
        };
    }
}
