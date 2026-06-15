import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  // Đừng quên import các thành phần này
  imports: [RouterOutlet, Navbar, Footer], 
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayout {
  // Layout này mặc định dùng type profile cho Navbar
  navType: 'profile' | 'default' = 'profile';
}