import { Injectable } from '@angular/core';

export interface InputState {
  isMovingForward: boolean;
  isMovingBackward: boolean;
  isTurningLeft: boolean;
  isTurningRight: boolean;
  isGameOver: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class InputControlService {
  private state: InputState = {
    isMovingForward: false,
    isMovingBackward: false,
    isTurningLeft: false,
    isTurningRight: false,
    isGameOver: false,
  };

  constructor() {}

  private keyDownHandler = (event: KeyboardEvent) => this.handleKeyDown(event);
  private keyUpHandler = (event: KeyboardEvent) => this.handleKeyUp(event);

  public init(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.resetMovement();
  }

  public getInputState(): InputState {
    return { ...this.state };
  }

  public setGameOver(value: boolean): void {
    this.state.isGameOver = value;

    if (value) {
      this.resetMovement();
    }
  }

  public setMovingForward(value: boolean): void {
    this.state.isMovingForward = value;
    if (value) this.state.isMovingBackward = false;
  }

  public setMovingBackward(value: boolean): void {
    this.state.isMovingBackward = value;
    if (value) this.state.isMovingForward = false;
  }

  public setTurningLeft(value: boolean): void {
    this.state.isTurningLeft = value;
    if (value) this.state.isTurningRight = false;
  }

  public setTurningRight(value: boolean): void {
    this.state.isTurningRight = value;
    if (value) this.state.isTurningLeft = false;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.state.isGameOver) return;

    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.setMovingForward(true);
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.setMovingBackward(true);
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.setTurningLeft(true);
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.setTurningRight(true);
        break;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.setMovingForward(false);
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.setMovingBackward(false);
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.setTurningLeft(false);
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.setTurningRight(false);
        break;
    }
  }

  private resetMovement(): void {
    this.state.isMovingForward = false;
    this.state.isMovingBackward = false;
    this.state.isTurningLeft = false;
    this.state.isTurningRight = false;
  }
}
