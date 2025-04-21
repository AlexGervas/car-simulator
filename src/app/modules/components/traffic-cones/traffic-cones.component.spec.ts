import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrafficConesComponent } from './traffic-cones.component';

describe('TrafficConesComponent', () => {
  let component: TrafficConesComponent;
  let fixture: ComponentFixture<TrafficConesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrafficConesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrafficConesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
