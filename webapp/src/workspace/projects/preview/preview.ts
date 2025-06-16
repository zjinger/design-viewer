import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Project } from '../project.model';

@Component({
  selector: 'app-preview',
  imports: [],
  templateUrl: './preview.html',
  styleUrl: './preview.less',
})
export class Preview {
  projectName = '';
  safeUrl: SafeResourceUrl | null = null;

  // 这里用模拟数据，实际可用服务调用替换
  private projects: Project[] = [
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const proj = this.projects.find((p) => p.id === id);
    if (!proj) {
      // 找不到项目则返回列表
      this.router.navigate(['/admin/projects']);
      return;
    }
    this.projectName = proj.name;
    // 通过 DomSanitizer 绕过 Angular 的安全检查
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      window.location.origin + proj.previewUrl
    );
  }

  goBack(): void {
    this.router.navigate(['/admin/projects']);
  }
}
