import { Routes } from '@angular/router';
import { Layout } from '../layout/layout';

export const routes: Routes = [
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  {
    path: 'admin',
    component: Layout,
    children: [
      {
        path: 'uploads',
        loadChildren: () =>
          import('../workspace/uploads/uploads-module').then(
            (m) => m.UploadsModule
          ),
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('../workspace/projects/projects-module').then(
            (m) => m.ProjectsModule
          ),
      },
    ],
  },
  {
    path: 'help',
    loadComponent: () => import('../useage/useage').then((m) => m.Useage),
  },
  {
    path: 'login',
    loadComponent: () => import('../login/login').then((m) => m.Login),
  },
  {
    path: '**',
    redirectTo: 'admin',
  },
];
