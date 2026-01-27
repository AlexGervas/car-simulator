import { Component } from '@angular/core';
import { ModelsLoaderService } from '../../core/services/models-loader.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css',
})
export class LoaderComponent {
  public isLoading: boolean = false;

  constructor(private modelsLoaderService: ModelsLoaderService) {
    this.modelsLoaderService.isLoading$.subscribe((loading) => {
      this.isLoading = loading;
    });
  }
}
