import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-game-layout',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './game-layout.html',
  styleUrls: ['./game-layout.css']
})
export class GameLayout {

}
