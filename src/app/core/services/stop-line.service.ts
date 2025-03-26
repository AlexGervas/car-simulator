import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class StopLineService {
    private createStopLineCallback!: () => Promise<void>;

    public setCreateStopLineCallback(callback: () => Promise<void>) {
        this.createStopLineCallback = callback;
    }

    public callCreateStopLine(): Promise<void> {
        if (this.createStopLineCallback) {
            return this.createStopLineCallback();
        } else {
            return Promise.reject('Create stop line callback is not set');
        }
    }
}
