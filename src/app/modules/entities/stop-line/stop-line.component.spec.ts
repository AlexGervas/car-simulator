import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopLineComponent } from './stop-line.component';

describe('StopLineComponent', () => {
  let component: StopLineComponent;
  let fixture: ComponentFixture<StopLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopLineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StopLineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
