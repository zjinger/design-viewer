import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-layout',
  imports: [RouterModule],
  templateUrl: './layout.html',
  styleUrl: './layout.less',
})
export class Layout {
  navCollapsed = false;

  toggleNav() {
    this.navCollapsed = !this.navCollapsed;
  }
}
