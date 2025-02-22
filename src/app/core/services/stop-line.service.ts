import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class StopLineService {
    private createStopLineCallback!: () => void;

    public setCreateStopLineCallback(callback: () => void) {
        this.createStopLineCallback = callback;
    }

    public callCreateStopLine() {
        if (this.createStopLineCallback) {
            this.createStopLineCallback();
        }
    }
}
