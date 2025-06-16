import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProjectsRoutingModule } from './projects-routing-module';
import { Projects } from './projects';

@NgModule({
  declarations: [Projects],
  imports: [CommonModule, ProjectsRoutingModule],
})
export class ProjectsModule {}
