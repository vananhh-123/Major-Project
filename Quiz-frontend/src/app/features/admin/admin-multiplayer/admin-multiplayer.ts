import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AdminApi,
  AdminRoomApi
} from '../../../services/admin-api';

type RoomStatus = 'Waiting' | 'Playing' | 'Finished';

interface AdminRoom {
  id: string;
  roomCode: string;
  quizTitle: string;
  host: string;
  players: number;
  status: RoomStatus;
  createdAt: string;
}

@Component({
  selector: 'app-admin-multiplayer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-multiplayer.html',
  styleUrl: './admin-multiplayer.css'
})
export class AdminMultiplayer implements OnInit {
  searchText = '';
  statusFilter = '';

  rooms: AdminRoom[] = [];
  loading = false;

  selectedRoom: AdminRoom | null = null;

  constructor(
    private adminApi: AdminApi,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms(): void {
    this.loading = true;

    this.adminApi.getAdminRooms().subscribe({
      next: (data: AdminRoomApi[]) => {
        this.rooms = data.map(item => this.mapRoom(item));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Cannot load multiplayer rooms:', err);
        this.rooms = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mapRoom(item: AdminRoomApi): AdminRoom {
    return {
      id: item.id,
      roomCode: item.roomCode || 'N/A',
      quizTitle: item.quizTitle || 'Unknown Quiz',
      host: item.host || 'Unknown Host',
      players: Number(item.players || 0),
      status: this.normalizeStatus(item.status),
      createdAt: item.createdAt || 'N/A'
    };
  }

  private normalizeStatus(value?: string): RoomStatus {
    const text = (value || '').toLowerCase();

    if (text === 'playing' || text === 'started') {
      return 'Playing';
    }

    if (text === 'finished' || text === 'ended') {
      return 'Finished';
    }

    return 'Waiting';
  }

  get totalRooms(): number {
    return this.rooms.length;
  }

  get waitingRooms(): number {
    return this.rooms.filter(room => room.status === 'Waiting').length;
  }

  get playingRooms(): number {
    return this.rooms.filter(room => room.status === 'Playing').length;
  }

  get finishedRooms(): number {
    return this.rooms.filter(room => room.status === 'Finished').length;
  }

  get totalPlayers(): number {
    return this.rooms.reduce((sum, room) => sum + room.players, 0);
  }

  get filteredRooms(): AdminRoom[] {
    const keyword = this.searchText.toLowerCase();

    return this.rooms.filter(room => {
      const matchesSearch =
        room.roomCode.toLowerCase().includes(keyword) ||
        room.quizTitle.toLowerCase().includes(keyword) ||
        room.host.toLowerCase().includes(keyword) ||
        room.id.toLowerCase().includes(keyword);

      const matchesStatus =
        this.statusFilter === '' ||
        room.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  viewRoom(room: AdminRoom): void {
    this.selectedRoom = room;
  }

  closeModal(): void {
    this.selectedRoom = null;
  }

  closeRoom(room: AdminRoom): void {
    alert('This feature is not yet developed. Please wait for future updates!');
  }
}