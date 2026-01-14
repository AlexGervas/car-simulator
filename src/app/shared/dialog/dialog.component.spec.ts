import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogComponent } from './dialog.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            showButtons: false,
            title: 'Поздравляем!',
            message: 'Задание выполнено',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should display title and message from data', () => {
      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.querySelector('.dialog-header')?.textContent).toContain(
        'Поздравляем!',
      );
      expect(compiled.querySelector('.dialog-message')?.textContent).toContain(
        'Задание выполнено',
      );
    });
  });

  describe('Conditional button rendering', () => {
    it('should show buttons when data.showButtons is true', () => {
      component.data.showButtons = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.dialog-buttons button');
      expect(buttons.length).toBe(2);
    });

    it('should not show buttons when data.showButtons is false', () => {
      component.data.showButtons = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const buttonContainer = compiled.querySelector('.dialog-buttons');
      expect(buttonContainer).toBeNull();
    });
  });

  describe('Button interaction', () => {
    beforeEach(() => {
      component.data.showButtons = true;
      fixture.detectChanges();
    });

    it('should call onConfirm() when "Yes" button is clicked', () => {
      spyOn(component, 'onConfirm');
      const yesButton = compiled.querySelector('button[color="primary"]');
      yesButton?.dispatchEvent(new Event('click'));
      expect(component.onConfirm).toHaveBeenCalled();
    });

    it('should call onCancel() when "No" button is clicked', () => {
      spyOn(component, 'onCancel');
      const noButton = compiled.querySelector('button[color="warn"]');
      noButton?.dispatchEvent(new Event('click'));
      expect(component.onCancel).toHaveBeenCalled();
    });
  });
});
