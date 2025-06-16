import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'design', pathMatch: 'full' },
  {
    path: 'design',
    loadComponent: () =>
      import('./file-upload/file-upload').then((m) => m.FileUpload),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UploadsRoutingModule {}
