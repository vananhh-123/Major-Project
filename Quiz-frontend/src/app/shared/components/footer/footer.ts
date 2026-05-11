import { Component } from '@angular/core';


@Component({
  selector: 'app-shared-footer', // Đảm bảo selector này khớp với <app-shared-footer>
  standalone: true,
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  showComingSoon(event: Event) {
    event.preventDefault();
    alert('Tính năng này hiện tại chưa được cập nhật!');
  }
}
