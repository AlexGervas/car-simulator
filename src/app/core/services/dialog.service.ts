import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogComponent } from '../../shared/dialog/dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  constructor(private dialog: MatDialog) { }

  public openDialog(title: string, message: string, showButtons: boolean = false): void {
    this.dialog.open(DialogComponent, {
      width: '300px',
      position: { top: '10%' },
      data: {
        title: title,
        message: message,
        showButtons: showButtons
      }
    });
  }

  public openDialogWithRef(title: string, message: string, showButtons: boolean = false): MatDialogRef<DialogComponent> {
    return this.dialog.open(DialogComponent, {
      width: '300px',
      position: { top: '10%' },
      data: {
        title: title,
        message: message,
        showButtons: showButtons
      }
    });
  }
}
