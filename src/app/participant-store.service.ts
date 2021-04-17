import { Injectable } from '@angular/core';
import { BehaviorSubject, NextObserver, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Participant } from './domain/domain';

@Injectable({
  providedIn: 'root'
})
export class ParticipantStoreService {

  public store: BehaviorSubject<Participant | undefined> = new BehaviorSubject<Participant | undefined>(undefined);

  public get participant(): Participant {
    return this.store.getValue() as Participant;
  }

  public init(f: Participant): void {
    this.store.next(f);
  }

  public subscribe(handler: (f:Participant) => void, destroy: Subject<any>): void {
    this.store
      .pipe(takeUntil(destroy))
      .subscribe(x => {
        if (x) {
          handler(x);
        }
      });
  }

  constructor() { }
}
