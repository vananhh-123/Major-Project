import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router'; // Thêm RouterOutlet
import { appConfig } from './app.config';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // Nhập RouterOutlet vào đây
  template: '<router-outlet></router-outlet>' // Chỉ cần thẻ này là đủ
})
export class App {} // Bạn có thể đổi tên class thành AppComponent nếu muốn


// Khởi chạy ứng dụng bằng App class trên
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
