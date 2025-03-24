import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModelsLoaderService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.loadingSubject.asObservable();

  public show() {
    this.loadingSubject.next(true);
  }

  public hide() {
    this.loadingSubject.next(false);
  }

}
