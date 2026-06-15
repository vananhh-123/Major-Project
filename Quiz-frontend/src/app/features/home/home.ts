import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home {
  joinPin: string = '';
  private router = inject(Router);

  onPinInput(event: Event) {
    // Chá»‰ cho phÃ©p nháºp sá»‘
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.joinPin = input.value;
  }

  joinGame() {
    if (this.joinPin && this.joinPin.length === 6) {
      this.router.navigate(['/play/multi/lobby'], {
        queryParams: { role: 'player', pin: this.joinPin }
      });
    } else {
      alert('Vui lòng nhập mã PIN hợp lệ gồm 6 chữ số!');
    }
  }
}