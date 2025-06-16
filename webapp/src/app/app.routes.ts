import { Routes } from '@angular/router';
import { Layout } from '../layout/layout';

export const routes: Routes = [
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  {
    path: 'admin',
    component: Layout,
    children: [
      {
        path: 'projects',
        loadComponent: () =>
          import('../workspace/projects/projects-module').then(
            (m) => m.ProjectsModule
          ),
      },
    ],
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
