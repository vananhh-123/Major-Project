import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar implements OnInit {
  @Input() type: 'auth' | 'home' | 'profile' | 'game' | 'auth-signin' | 'auth-signup' | 'dashboard' = 'home';
  username: string = 'Alex Rivera';
  avatar: string = '/User.png';

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user && user.user_name) {
          this.username = user.user_name;
        } else if (user && user.username) {
          this.username = user.username;
        }
        
        if (user && user.avatar) {
          this.avatar = user.avatar;
        }
      } catch (e) {
        console.error('Error parsing user', e);
      }
    }
  }
}
