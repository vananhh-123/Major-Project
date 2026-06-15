import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Navbar } from '../../shared/components/navbar/navbar'; 
import { Footer } from '../../shared/components/footer/footer'; 

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer, CommonModule], 
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css'
})
export class AuthLayout implements OnInit {
  // Kiểu dữ liệu khớp với Input của Navbar
  navType: 'home' | 'auth-signin' | 'auth-signup' = 'home';

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateNavType(this.router.url);
    
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateNavType(event.url);
    });
  }

  updateNavType(url: string) {
    if (url.includes('login')) {
      this.navType = 'auth-signin'; // Hiện: Don't have an account? Sign up
    } else if (url.includes('register')) {
      this.navType = 'auth-signup'; // Hiện: Already a member? Sign in
    } else {
      this.navType = 'home';
    }
  }
}