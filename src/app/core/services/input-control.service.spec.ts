import { TestBed } from '@angular/core/testing';

import { InputControlService } from './input-control.service';

describe('InputControlService', () => {
  let service: InputControlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InputControlService);
  });

  afterEach(() => {
    service.destroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle arrow key movement', () => {
    service.init();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true })
    );
    expect(service.getInputState().isMovingForward).toBeTrue();

    window.dispatchEvent(
      new KeyboardEvent('keyup', { code: 'ArrowUp', bubbles: true })
    );
    expect(service.getInputState().isMovingForward).toBeFalse();
  });

  it('should handle WASD keys', () => {
    service.init();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true })
    );
    expect(service.getInputState().isMovingForward).toBeTrue();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyS', bubbles: true })
    );
    expect(service.getInputState().isMovingBackward).toBeTrue();
    expect(service.getInputState().isMovingForward).toBeFalse();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyA', bubbles: true })
    );
    expect(service.getInputState().isTurningLeft).toBeTrue();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyD', bubbles: true })
    );
    expect(service.getInputState().isTurningRight).toBeTrue();
    expect(service.getInputState().isTurningLeft).toBeFalse();
  });

  it('should ignore keyboard input when game is over', () => {
    service.init();
    service.setGameOver(true);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true })
    );

    expect(service.getInputState().isMovingForward).toBeFalse();
  });

  it('should reset movement when game over is set', () => {
    service.setMovingForward(true);
    service.setTurningLeft(true);
    service.setGameOver(true);

    const state = service.getInputState();
    expect(state.isMovingForward).toBeFalse();
    expect(state.isTurningLeft).toBeFalse();
    expect(state.isGameOver).toBeTrue();
  });

  it('should expose a copy of state from getInputState', () => {
    service.setMovingForward(true);
    const state = service.getInputState();
    state.isMovingForward = false;

    expect(service.getInputState().isMovingForward).toBeTrue();
  });

  it('should remove listeners on destroy', () => {
    service.init();
    service.destroy();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true })
    );

    expect(service.getInputState().isMovingForward).toBeFalse();
  });
});
