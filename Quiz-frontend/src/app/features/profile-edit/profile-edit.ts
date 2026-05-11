import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-edit.html',
  styleUrls: ['./profile-edit.css'],
})
export class ProfileEdit implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);

  user = {
    id: '',
    username: 'Alex Rivera',
    accountId: 'ID_882941',
    email: 'alex.rivera@example.com',
    bio: 'Passionate quizzer and knowledge seeker...',
    avatar: '/User.png'
  };

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        this.user.id = parsed.id || '';
        this.user.username = parsed.username || parsed.name || 'Alex Rivera';
        this.user.email = parsed.email || 'No email provided';
        this.user.bio = parsed.bio || 'Master of Logic & Digital Lore';
        this.user.avatar = parsed.avatar || '/User.png';
        
        // Tạo Account ID báº±ng 5 kÃ½ tá»± Ä‘áº§u cá»§a ID, viáº¿t hoa
        if (parsed.id) {
          this.user.accountId = 'ID_' + parsed.id.substring(0, 5).toUpperCase();
        }
      } catch(e) {
        console.error('Failed to parse user data', e);
      }
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.user.avatar = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async saveChanges() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        
        parsed.username = this.user.username;
        parsed.bio = this.user.bio;
        parsed.avatar = this.user.avatar;
        
        localStorage.setItem('user', JSON.stringify(parsed));

        if (this.user.id) {
          await firstValueFrom(
            this.http.patch('http://10.106.34.149:8080/auth/profile', {
              user_id: this.user.id,
              username: this.user.username,
              avatar: this.user.avatar,
              bio: this.user.bio
            })
          );
        }

        alert('Profile updated successfully!');
        
        this.router.navigate(['/app/profile']);
      } catch(e) {
        console.error('Failed to update profile', e);
        alert('Failed to save profile');
      }
    }
  }

  cancel() {
    this.router.navigate(['/app/profile']);
  }
}
