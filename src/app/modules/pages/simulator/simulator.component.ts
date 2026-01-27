import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  HostListener,
  AfterViewInit,
  AfterViewChecked,
  ViewContainerRef,
  ComponentFactoryResolver,
  OnDestroy,
} from '@angular/core';
import * as THREE from 'three';
import { TrafficConesComponent } from '../../entities/traffic-cones/traffic-cones.component';
import { DeviceService } from '../../../core/services/device.service';
import { CommonModule } from '@angular/common';
import { ConeStateService } from '../../../core/services/cone-state.service';
import { StopLineService } from '../../../core/services/stop-line.service';
import { ModelsLoaderService } from '../../../core/services/models-loader.service';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import * as CANNON from 'cannon-es';
import { BridgeComponent } from '../../entities/bridge/bridge.component';
import { GroundComponent } from '../../entities/ground/ground.component';
import { CarComponent } from '../../entities/car/car.component';
import { LevelService } from '../../../core/services/level.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { of, Subscription, switchMap, tap } from 'rxjs';
import { StopLineComponent } from '../../entities/stop-line/stop-line.component';
import { DialogService } from '../../../core/services/dialog.service';
import { User } from '../../../core/models/user';
import { ApiService } from '../../../core/services/api.service';
import { TelegramService } from '../../../core/services/telegram.service';
import { RendererFactoryService } from '../../../core/services/renderer-factory.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    TrafficConesComponent,
    BridgeComponent,
    GroundComponent,
    CarComponent,
    MatCardModule,
    MatButtonModule,
    StopLineComponent,
  ],
  templateUrl: './simulator.component.html',
  styleUrl: './simulator.component.css',
})
export class SimulatorComponent
  implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy
{
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('LoaderComponent') loader!: LoaderComponent;
  @ViewChild('StopLineComponent') stopLineComponent!: StopLineComponent;
  @ViewChild(CarComponent, { static: false }) carComponent!: CarComponent;
  @ViewChild(TrafficConesComponent, { static: false })
  trafficCones!: TrafficConesComponent;
  @ViewChild(GroundComponent) ground!: GroundComponent;

  @ViewChild('dynamicComponents', { read: ViewContainerRef, static: true })
  dynamicComponents!: ViewContainerRef;
  public bridgeComponentInstance?: BridgeComponent;

  private carCollisionSubscription: Subscription | undefined;
  private gameOverSubscription: Subscription | undefined;

  public world!: CANNON.World;
  public camera!: THREE.PerspectiveCamera;
  public car!: THREE.Object3D;
  public carBody!: CANNON.Body;
  public scene!: THREE.Scene;
  public renderer!: THREE.WebGLRenderer;

  private turnSpeed: number = 1;
  public hitConeCount: number = 0;

  public isMovingForward: boolean = false;
  public isMovingBackward: boolean = false;
  public isTurningLeft: boolean = false;
  public isTurningRight: boolean = false;
  public isMobileDevice: boolean = false;
  public isConeFallen: boolean = false;
  public isGameOver: boolean = false;
  public controlsEnabled: boolean = false;

  public exerciseStarted: boolean = false;
  public checkDialogShown: boolean = false;
  public stoppedOnce: boolean = false;
  public temporaryBlockDialog: boolean = false;
  public isResultDialogShown: boolean = false;
  public isNextLevel: boolean = false;

  public currentLevel: 'parallel-parking' | 'snake' | 'garage' | 'steep-grade' =
    'snake';
  public clock!: THREE.Clock;

  private stopCheckTimeout: number | null = null;
  public isCheckingConditions: boolean = false;

  public user: User | null = null;

  // eslint-disable-next-line max-params
  constructor(
    private el: ElementRef,
    public router: Router,
    public route: ActivatedRoute,
    private deviceService: DeviceService,
    public coneStateService: ConeStateService,
    private stopLineService: StopLineService,
    public levelService: LevelService,
    private componentFactoryResolver: ComponentFactoryResolver,
    public modelsLoaderService: ModelsLoaderService,
    private dialogService: DialogService,
    public dialog: MatDialog,
    private api: ApiService,
    private telegramService: TelegramService,
    private rendererFactory: RendererFactoryService,
    private userService: UserService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.modelsLoaderService.show();
    this.isMobileDevice = this.deviceService.isMobile();
    this.clock = new THREE.Clock();

    if (this.telegramService.isTelegramEnv()) {
      const tgUser = this.telegramService.getTelegramUser();
      if (tgUser) {
        this.authService.loginWithTelegram(tgUser.userId).subscribe({
          next: () => {
            this.user = this.userService.getUser();
          },
          error: (err) => {
            console.error('Telegram login failed:', err);
          },
        });
      }
    } else {
      this.user = this.userService.getUser();
      if (!this.user) {
        this.userService.loadUserFromApi().subscribe((user) => {
          this.user = user;
        });
      }
    }

    this.initSceneAndWorld();

    try {
      this.car = await this.loadCarFromCarComponent();
    } catch (error) {
      console.error('Car loading error', error);
      this.modelsLoaderService.hide();
      return;
    }

    if (this.carComponent) {
      this.carCollisionSubscription =
        this.carComponent.carCheckCollisionWithCones.subscribe(
          (position: CANNON.Vec3) => {
            this.checkCollisionWithCones(position);
          }
        );
      this.gameOverSubscription = this.carComponent.gameOverCheck.subscribe(
        () => this.checkGameOverConditions()
      );
    }

    if (this.ground) {
      this.ground.loadGroundModel();
    } else {
      console.error('GroundComponent is not initialized yet');
    }

    this.route.queryParams.subscribe((params) => {
      const level = params['level'] || 'snake';
      this.currentLevel = level;

      const checkTrafficCones = setInterval(() => {
        if (this.trafficCones) {
          this.trafficCones.world = this.world;
          clearInterval(checkTrafficCones);
          this.initLevel(level);
        }
      }, 0);
    });

    this.startRenderingLoop();
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  ngAfterViewInit() {
    if (!this.scene) {
      console.error(
        'Error: the scene is not initialized before being passed to TrafficCones'
      );
      return;
    }

    if (this.trafficCones) {
      this.trafficCones.setScene(this.scene);
      this.trafficCones.camera = this.camera;
    } else {
      console.warn(
        'TrafficConesComponent is not yet available in ngAfterViewInit'
      );
    }

    if (this.carComponent) {
      this.carComponent.ground = this.ground;
    }

    if (this.stopLineComponent) {
      this.stopLineService.setCreateStopLineCallback(
        this.createStopLine.bind(this)
      );
    }
  }

  ngAfterViewChecked() {
    if (this.trafficCones && this.car && !this.trafficCones.car) {
      setTimeout(() => {
        this.trafficCones.car = this.car;
      });
    }
  }

  ngOnDestroy() {
    if (this.carCollisionSubscription) {
      this.carCollisionSubscription.unsubscribe();
    }
    if (this.gameOverSubscription) {
      this.gameOverSubscription.unsubscribe();
    }
  }

  onCarLoaded(car: THREE.Object3D): void {
    this.car = car;
  }

  public async loadCarFromCarComponent(): Promise<THREE.Object3D> {
    while (!this.carComponent) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    return new Promise((resolve) => {
      this.carComponent.carLoaded.subscribe((car: THREE.Object3D) => {
        resolve(car);
      });
    });
  }

  private startRenderingLoop() {
    if (!this.car) {
      console.error('Error: Machine not yet loaded in startRenderingLoop');
      return;
    }

    this.animate();
  }

  public async initLevel(level: string): Promise<void> {
    this.hitConeCount = 0;
    this.modelsLoaderService.show();
    this.stopLineService.setScene(this.scene);

    await this.clearLevelScene();

    if (level === 'snake') {
      await this.initSnakeScene();
    } else if (level === 'parallel-parking') {
      await this.initParallelParkingScene();
    } else if (level === 'garage') {
      await this.initGarageScene();
    } else {
      await this.initSteepGradeScene();
    }

    this.modelsLoaderService.hide();
  }

  private clearLevelScene(): Promise<void> {
    return new Promise((resolve) => {
      if (this.trafficCones) {
        this.trafficCones.removeCones();
      }
      this.coneStateService.clearConeStates();
      this.stopLineService.removeStopLine();
      resolve();
    });
  }

  public async initSnakeScene(): Promise<void> {
    try {
      await this.trafficCones.createSnake();
      this.coneStateService.initializeConeStates(
        this.trafficCones.cones.length
      );
    } catch (error) {
      console.error('Error when initializing Snake scene:', error);
    }
  }

  public async initParallelParkingScene(): Promise<void> {
    this.exerciseStarted = false;
    this.checkDialogShown = false;
    this.stoppedOnce = false;
    this.isCheckingConditions = false;

    if (!this.scene) {
      return Promise.reject('Scene is not initialized');
    }

    try {
      this.trafficCones.createParallelParking();
      this.coneStateService.initializeConeStates(
        this.trafficCones.cones.length
      );
    } catch {
      console.error('Error initialization of the ParallelParking scene:');
    }
  }

  public async initGarageScene(): Promise<void> {
    this.exerciseStarted = false;
    this.checkDialogShown = false;
    this.stoppedOnce = false;
    this.isCheckingConditions = false;
    try {
      this.trafficCones.createGarage();
      this.coneStateService.initializeConeStates(
        this.trafficCones.cones.length
      );
    } catch {
      console.error('Error initialization of the Garage scene');
    }
  }

  public async initSteepGradeScene(): Promise<void> {
    if (!this.bridgeComponentInstance) {
      const factory =
        this.componentFactoryResolver.resolveComponentFactory(BridgeComponent);
      const bridgeComponentRef =
        this.dynamicComponents?.createComponent(factory);
      this.bridgeComponentInstance = bridgeComponentRef?.instance;

      if (!this.bridgeComponentInstance) {
        console.error('BridgeComponent instance not created.');
        return;
      }

      this.bridgeComponentInstance.scene = this.scene;
      this.bridgeComponentInstance.world = this.world;

      await this.bridgeComponentInstance.createBridge();
    }

    if (this.carComponent) {
      this.carComponent.bridge = this.bridgeComponentInstance;
    }

    this.bridgeComponentInstance.hasCrossedBridge = false;
    this.bridgeComponentInstance.isOnBridge = false;
    this.bridgeComponentInstance.outOfBounds = false;
    this.bridgeComponentInstance.hasPassedByBridge = false;
  }

  public startGame(): void {
    this.isGameOver = false;
    this.controlsEnabled = false;
  }

  public resetGameState(): void {
    this.isGameOver = false;
    this.isMovingForward = false;
    this.isMovingBackward = false;
    this.hitConeCount = 0;
    this.coneStateService.resetConeState();
    this.trafficCones.resetCones();

    if (this.bridgeComponentInstance) {
      this.bridgeComponentInstance.hasCrossedBridge = false;
      this.bridgeComponentInstance.isOnBridge = false;
      this.bridgeComponentInstance.outOfBounds = false;
      this.bridgeComponentInstance.hasPassedByBridge = false;
    }

    if (this.carComponent) {
      this.carComponent.currentSpeed = 0;
      this.carComponent.resetCarPosition();
      this.carComponent.createPhysicsCarBody(this.carComponent.finalHeight);

      this.carComponent.vehicle.wheelInfos.forEach((wheel) => {
        wheel.deltaRotation = 0;
      });
      this.carComponent.createPhysicsWheels(this.carComponent.scaleFactor);
    }

    if (this.carBody) {
      this.world.removeBody(this.carBody);
    }

    this.checkDialogShown = false;
    this.stoppedOnce = false;
    this.isCheckingConditions = false;
    this.isResultDialogShown = false;
    this.temporaryBlockDialog = false;
    this.dialog.closeAll();
  }

  public async goToNextLevel(): Promise<void> {
    const nextLevel = this.levelService.getNextLevel(this.currentLevel);

    if (
      nextLevel &&
      this.levelService.isNextLevelAvailable(this.currentLevel)
    ) {
      this.resetGameState();
      this.coneStateService.resetConeState();
      this.trafficCones.clearParkingLines();
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { level: nextLevel },
        queryParamsHandling: 'merge',
      });
    }
  }

  public initSceneAndWorld(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc0c0c0);

    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);

    const canvas = this.el.nativeElement.querySelector('#webgl-canvas');
    this.renderer = this.rendererFactory.createRenderer(canvas);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const light = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    this.scene.add(directionalLight);
  }

  public animatePhysics(deltaTime: number): void {
    const fixedTimeStep = 1 / 60;
    const maxSubSteps = 3;
    this.world.step(fixedTimeStep, deltaTime, maxSubSteps);

    if (this.carBody) {
      this.car.position.set(
        this.carBody.position.x,
        this.carBody.position.y,
        this.carBody.position.z
      );
      this.car.quaternion.set(
        this.carBody.quaternion.x,
        this.carBody.quaternion.y,
        this.carBody.quaternion.z,
        this.carBody.quaternion.w
      );
    }

    this.trafficCones.coneBodies.forEach((body, index) => {
      const cone = this.trafficCones.getCones()[index];
      cone.position.set(body.position.x, 0, body.position.z);
      cone.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w
      );
    });
  }

  public animate() {
    requestAnimationFrame(() => this.animate());
    const deltaTime = this.clock.getDelta();
    this.animatePhysics(deltaTime);

    this.carComponent.updateCarPosition(deltaTime, {
      isMovingForward: this.isMovingForward,
      isMovingBackward: this.isMovingBackward,
      isTurningLeft: this.isTurningLeft,
      isTurningRight: this.isTurningRight,
      isGameOver: this.isGameOver,
    });

    this.updateCameraPosition();

    // const cannonDebugger = CannonDebugger(this.scene, this.world, {
    //   color: 0xff0000,
    // });
    // cannonDebugger.update();

    this.renderer.render(this.scene, this.camera);
  }

  public updateCameraPosition() {
    if (this.car) {
      const offset = new THREE.Vector3(0, 2, 5);
      this.camera.position.copy(this.car.position).add(offset);

      const direction = new THREE.Vector3();
      this.car.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();

      this.camera.lookAt(this.car.position.clone().sub(direction));
    }
  }

  private checkCollisionWithCones(carPosition: CANNON.Vec3) {
    const collisionThreshold = 2;
    const positionShiftThreshold = 0.1;

    for (let i = 0; i < this.trafficCones.coneBodies.length; i++) {
      const coneBody = this.trafficCones.coneBodies[i];

      const distance = carPosition.distanceTo(coneBody.position);

      if (distance > collisionThreshold) {
        continue;
      }

      if (!this.coneStateService.isConeFallen(i)) {
        const initialPosition = this.trafficCones.getInitialConePositions()[i];
        const positionShift = coneBody.position.vsub(initialPosition).length();

        if (positionShift > positionShiftThreshold) {
          this.hitConeCount++;
          this.coneStateService.setConeFallen(i);

          const fallDirection = new CANNON.Vec3(
            coneBody.position.x - carPosition.x,
            0.1,
            coneBody.position.z - carPosition.z
          ).unit();

          const impulse = new CANNON.Vec3(
            fallDirection.x * 0.2,
            0.5,
            fallDirection.z * 0.2
          );
          coneBody.applyImpulse(impulse, coneBody.position);
        }
      }
    }
  }

  private checkGameOverConditions() {
    switch (this.currentLevel) {
      case 'snake':
        this.handleSnakeLevelGameOver();
        break;
      case 'parallel-parking':
      case 'garage':
        this.handleParkingLevelGameOver();
        break;
      case 'steep-grade':
        this.handleSteepGradeLevelGameOver();
        break;
    }
  }

  private ensureUser$() {
    const cached = this.userService.getUser();
    if (cached) {
      return of(cached);
    }
    return this.userService
      .loadUserFromApi()
      .pipe(tap((user) => (this.user = user)));
  }

  private handleSnakeLevelGameOver(): void {
    const lastConeBox =
      this.trafficCones.getConeBoxes()[
        this.trafficCones.getConeBoxes().length - 1
      ];
    if (lastConeBox) {
      const stopLineZ = Math.floor(lastConeBox.max.z - 8);

      if (this.carComponent.car.position.z < stopLineZ) {
        this.dialogService.openDialog(
          'Игра окончена',
          'Вы проехали стоп-линию и сбили ' + this.hitConeCount + ' конусов.',
          false
        );
        this.isGameOver = true;
        this.controlsEnabled = true;
        this.isNextLevel = false;

        if (this.hitConeCount === 0) {
          this.ensureUser$()
            .pipe(
              switchMap((user) =>
                this.api.completeLevel(user.userId, this.currentLevel)
              )
            )
            .subscribe({
              next: async () => {
                try {
                  await this.levelService.loadLevels(this.user!.userId);
                  setTimeout(() => {
                    this.isNextLevel = this.levelService.isNextLevelAvailable(
                      this.currentLevel
                    );
                  }, 200);
                } catch (err) {
                  console.error(
                    `Error loading levels after level ${this.currentLevel}:`,
                    err
                  );
                }
              },
              error: (err) =>
                console.error(
                  `Error updating level ${this.currentLevel} on server:`,
                  err
                ),
            });
        }
      }
    }
  }

  private handleParkingLevelGameOver(): void {
    if (!this.isMovingForward && !this.isMovingBackward) {
      if (this.exerciseStarted && !this.checkDialogShown) {
        if (this.shouldShowCheckDialog()) {
          this.showCheckDialog();
        }
      }
    } else {
      this.exerciseStarted = true;
    }
  }

  private handleSteepGradeLevelGameOver(): void {
    if (this.bridgeComponentInstance?.hasCrossedBridge) {
      this.dialogService.openDialog(
        'Поздравляем!',
        'Вы успешно проехали мост! Все упражнения завершены!',
        false
      );
      this.isGameOver = true;
      this.controlsEnabled = true;
      this.isNextLevel = false;

      this.ensureUser$()
        .pipe(
          switchMap((user) =>
            this.api.completeLevel(user.userId, this.currentLevel)
          )
        )
        .subscribe({
          next: async () => {
            try {
              await this.levelService.loadLevels(this.user!.userId);
            } catch (err) {
              console.error(
                `Error loading levels after level ${this.currentLevel}:`,
                err
              );
            }
          },
          error: (err) =>
            console.error(
              `Error updating level ${this.currentLevel} on server:`,
              err
            ),
        });
    } else if (this.bridgeComponentInstance?.outOfBounds) {
      this.dialogService.openDialog(
        'Задание не выполнено',
        'Вы вышли за пределы моста. Начните заново.',
        false
      );
      this.isGameOver = true;
      this.controlsEnabled = true;
    } else if (this.bridgeComponentInstance?.hasPassedByBridge) {
      this.dialogService.openDialog(
        'Задание не выполнено',
        'Машина проехала мимо моста.',
        false
      );
      this.isGameOver = true;
      this.controlsEnabled = true;
    }
  }

  private shouldShowCheckDialog(): boolean {
    if (
      this.checkDialogShown ||
      this.isCheckingConditions ||
      this.temporaryBlockDialog ||
      this.isResultDialogShown
    ) {
      return false;
    }

    if (!this.exerciseStarted) {
      return false;
    }

    const { preciseMatch, nearMatch } =
      this.trafficCones.checkCarInsideParkingPocket();

    return preciseMatch || nearMatch;
  }

  private showCheckDialog(): void {
    this.checkDialogShown = true;

    const dialogRef = this.dialogService.openDialogWithRef(
      'Остановились',
      'Можно проверять задание?',
      true
    );

    dialogRef.afterClosed().subscribe((result: boolean) => {
      this.checkDialogShown = false;
      if (result) {
        this.startParkingCheck();
      } else {
        this.stoppedOnce = false;
        this.temporaryBlockDialog = true;

        const interval = setInterval(() => {
          if (this.isMovingForward || this.isMovingBackward) {
            this.temporaryBlockDialog = false;
            clearInterval(interval);
          }
        }, 100);
      }
    });
  }

  private startParkingCheck(): void {
    if (this.isCheckingConditions) {
      return;
    }

    this.isCheckingConditions = true;

    this.stopCheckTimeout = window.setTimeout(() => {
      let errorMessage = '';

      if (this.hitConeCount > 0) {
        errorMessage += `Машина задела ${this.hitConeCount} конус(ы). \n`;
      }

      if (this.currentLevel === 'parallel-parking') {
        const carRotationTolerance = 0.1;
        const carRotation = this.car.rotation.y % (2 * Math.PI);
        const isParallel =
          Math.abs(carRotation - Math.PI) < carRotationTolerance ||
          Math.abs(carRotation) < carRotationTolerance;
        if (!isParallel) {
          errorMessage += 'Машина не параллельна конусам.\n';
        }
      }

      const { preciseMatch, nearMatch } =
        this.trafficCones.checkCarInsideParkingPocket();
      if (!preciseMatch && nearMatch) {
        errorMessage += 'Машина находится не точно в кармане, но допустимо.\n';
      } else if (!preciseMatch) {
        errorMessage += 'Машина не находится в парковочном кармане.\n';
      }

      if (errorMessage) {
        this.isNextLevel = false;
        this.isResultDialogShown = true;
        this.isGameOver = true;
        this.controlsEnabled = true;
        this.dialogService.openDialog(
          'Задание не выполнено',
          `${errorMessage} Попробуйте снова.`,
          false
        );
      } else {
        this.isResultDialogShown = true;
        this.isGameOver = true;

        this.ensureUser$()
          .pipe(
            switchMap((user) =>
              this.api.completeLevel(user.userId, this.currentLevel)
            )
          )
          .subscribe({
            next: async () => {
              this.dialogService.openDialog(
                'Поздравляем!',
                'Задание выполнено',
                false
              );
              try {
                await this.levelService.loadLevels(this.user!.userId);
                setTimeout(() => {
                  this.isNextLevel = this.levelService.isNextLevelAvailable(
                    this.currentLevel
                  );
                }, 200);
              } catch (err) {
                console.error(
                  `Error loading levels after level ${this.currentLevel}:`,
                  err
                );
              }
            },
            error: (err) =>
              console.error(
                `Error updating level ${this.currentLevel} on server:`,
                err
              ),
          });
      }
      this.isCheckingConditions = false;
    }, 2000);
  }

  private createStopLine(): Promise<void> {
    return new Promise((resolve, reject) => {
      const lastConeIndex = this.trafficCones.getConeBoxes().length - 1;
      const lastConeBox = this.trafficCones.getConeBoxes()[lastConeIndex];

      if (!lastConeBox) {
        reject(new Error('No cones available to create stop line.'));
        return;
      }

      this.stopLineComponent
        .createStopLine(lastConeBox)
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  }

  public turnLeft() {
    this.isTurningLeft = true;
    this.isTurningRight = false;
    this.carComponent.updateFrontWheels(
      this.isTurningLeft,
      this.isTurningRight
    );
  }

  public stopTurningLeft() {
    this.isTurningLeft = false;
    this.carComponent.updateFrontWheels(
      this.isTurningLeft,
      this.isTurningRight
    );
  }

  public turnRight() {
    this.isTurningRight = true;
    this.isTurningLeft = false;
    this.carComponent.updateFrontWheels(
      this.isTurningLeft,
      this.isTurningRight
    );
  }

  public stopTurningRight() {
    this.isTurningRight = false;
    this.carComponent.updateFrontWheels(
      this.isTurningLeft,
      this.isTurningRight
    );
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // if (this.isMobileDevice) return;

    if (this.car && !this.isGameOver) {
      if (event.key === 'ArrowUp') {
        this.isMovingForward = true;
      } else if (event.key === 'ArrowDown') {
        this.isMovingBackward = true;
      } else if (event.key === 'ArrowLeft') {
        this.isTurningLeft = true;
        this.isTurningRight = false;
        this.carComponent.updateFrontWheels(
          this.isTurningLeft,
          this.isTurningRight
        );
      } else if (event.key === 'ArrowRight') {
        this.isTurningRight = true;
        this.isTurningLeft = false;
        this.carComponent.updateFrontWheels(
          this.isTurningLeft,
          this.isTurningRight
        );
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUpEvent(event: KeyboardEvent) {
    // if (this.isMobileDevice) return;

    if (event.key === 'ArrowUp') {
      this.isMovingForward = false;
    } else if (event.key === 'ArrowDown') {
      this.isMovingBackward = false;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      this.isTurningLeft = false;
      this.isTurningRight = false;
      this.carComponent.updateFrontWheels(
        this.isTurningLeft,
        this.isTurningRight
      );
    }
  }

  // Управление с мобильного
  preventDefault(event: TouchEvent) {
    event.preventDefault();
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobileDevice = this.deviceService.isMobile();
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
