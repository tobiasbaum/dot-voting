import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeerStatusComponent } from './peer-status.component';

describe('PeerStatusComponent', () => {
  let component: PeerStatusComponent;
  let fixture: ComponentFixture<PeerStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PeerStatusComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PeerStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
