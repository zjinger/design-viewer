import { CommonModule } from '@angular/common';
import { HttpClient, HttpRequest, HttpResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import {
  NzUploadChangeParam,
  NzUploadFile,
  NzUploadModule,
} from 'ng-zorro-antd/upload';
import { filter } from 'rxjs/operators';
@Component({
  selector: 'app-file-upload',
  imports: [
    CommonModule,
    NzIconModule,
    NzUploadModule,
    NzButtonModule,
    NzModalModule,
    NzTagModule,
    NzListModule,
  ],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.less',
})
export class FileUpload {
  uploading = false;
  fileList: NzUploadFile[] = [];
  constructor(
    private http: HttpClient,
    private modalService: NzModalService,
    private messageService: NzMessageService
  ) {}

  beforeUpload = (file: NzUploadFile): boolean => {
    this.fileList = this.fileList.concat(file);
    return false;
  };

  handleChange({ file, fileList }: NzUploadChangeParam): void {
    const status = file.status;
    if (status !== 'uploading') {
      console.log(file, fileList);
    }
    if (status === 'done') {
      this.messageService.success(`${file.name} file uploaded successfully.`);
    } else if (status === 'error') {
      this.messageService.error(`${file.name} file upload failed.`);
    }
  }

  handleUpload(): void {
    this.modalService.confirm({
      nzTitle: '确认上传吗？',
      nzContent: '上传后将开始处理文件，请确保文件格式正确。',
      nzOnOk: () => {
        const messageId =
          this.messageService.loading('正在上传文件，请稍候...').messageId;
        this.customUpload(messageId);
      },
      nzOnCancel: () => {
        this.messageService.info('已取消上传');
      },
    });
  }

  handleReset(): void {
    this.modalService.confirm({
      nzTitle: '确认重置吗？',
      nzContent: '重置后将清空已上传的文件。',
      nzOnOk: () => {
        this.messageService.success('已重置上传列表');
        // TODO: 清空列表
      },
    });
  }

  /**
   * 自定义上传方法
   */
  private customUpload(messageId: string): void {
    const formData = new FormData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.fileList.forEach((file: NzUploadFile) => {
      formData.append('files[]', file as any);
    });
    this.uploading = true;
    const req = new HttpRequest(
      'POST',
      'https://www.mocky.io/v2/5cc8019d300000980a055e76',
      formData,
      {
        reportProgress: true,
      }
    );
    this.http
      .request(req)
      .pipe(filter((e) => e instanceof HttpResponse))
      .subscribe({
        next: () => {
          this.uploading = false;
          // this.fileList = [];
          this.messageService.success('文件上传成功');
          this.messageService.remove(messageId);
        },
        error: () => {
          this.uploading = false;
          this.messageService.error('文件上传失败');
          this.messageService.remove(messageId);
        },
      });
  }
}
