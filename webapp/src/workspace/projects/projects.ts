import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Project } from './project.model';

@Component({
  selector: 'app-projects',
  standalone: false,
  templateUrl: './projects.html',
  styleUrl: './projects.less',
})
export class Projects implements OnInit {
  projects: Project[] = [];
  selectedId: string | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  private loadProjects(): void {
    // TODO: 替换为真正的项目列表服务调用
    this.projects = [
      {
        id: 'a',
        name: 'Demo 项目 A',
        updated: new Date('2025-06-15'),
        previewUrl: '/public/projects/国产AIS管理系统2/index.html',
      },
      {
        id: 'b',
        name: 'Design Sketch B',
        updated: new Date('2025-06-14'),
        previewUrl: '/public/projects/国产AIS管理系统2/index.html',
      },
    ];
  }

  /** 跳转到项目详情（可改为更深层路由或状态管理） */
  openDetail(proj: Project): void {
    this.selectedId = proj.id;
    this.router.navigate(['/admin/projects/preview', proj.id]);
    // 例如：navigate 到 /admin/projects/detail/:id
    // this.router.navigate(['admin','projects','detail', proj.id]);
  }

  /** 新窗口预览静态页面 */
  viewPreview(proj: Project): void {
    window.open(proj.previewUrl, '_blank');
  }
}
