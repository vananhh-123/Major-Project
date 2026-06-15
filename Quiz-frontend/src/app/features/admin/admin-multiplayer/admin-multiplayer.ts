import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';

import {
  AdminApi,
  AdminRoomApi
} from '../../../services/admin-api';

type RoomStatus = 'Waiting' | 'Playing' | 'Finished' | 'Closed';

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
export class AdminMultiplayer implements OnInit, OnDestroy {
  searchText = '';
  statusFilter = '';

  rooms: AdminRoom[] = [];
  loading = false;

  selectedRoom: AdminRoom | null = null;

  private readonly autoCloseHours = 2;
  private refreshSub?: Subscription;

  constructor(
    private adminApi: AdminApi,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRooms();

    this.refreshSub = interval(5000).subscribe(() => {
      this.loadRooms(false);
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadRooms(showLoading: boolean = true): void {
    if (showLoading) {
      this.loading = true;
    }

    this.adminApi.getAdminRooms().subscribe({
      next: (data: AdminRoomApi[]) => {
        this.rooms = (data || []).map(item => this.mapRoom(item));

        if (this.selectedRoom) {
          const latestSelected = this.rooms.find(
            room => room.id === this.selectedRoom?.id
          );

          this.selectedRoom = latestSelected || null;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Cannot load multiplayer rooms:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refreshRooms(): void {
    this.loadRooms(true);
  }

  private mapRoom(item: AdminRoomApi): AdminRoom {
    return {
      id: String(item.id || ''),
      roomCode: String(item.roomCode || 'N/A'),
      quizTitle: String(item.quizTitle || 'Unknown Quiz'),
      host: String(item.host || 'Unknown Host'),
      players: Number(item.players || 0),
      status: this.normalizeStatus(item),
      createdAt: this.formatCreatedDate(item.createdAt)
    };
  }

  private normalizeStatus(room: AdminRoomApi): RoomStatus {
    const status = String(room.status || '').toLowerCase();

    if (
      status === 'playing' ||
      status === 'started' ||
      status === 'active' ||
      status === 'live'
    ) {
      return 'Playing';
    }

    if (
      status === 'finished' ||
      status === 'ended' ||
      status === 'complete' ||
      status === 'completed'
    ) {
      return 'Finished';
    }

    if (
      status === 'closed' ||
      status === 'expired' ||
      status === 'cancelled' ||
      status === 'canceled'
    ) {
      return 'Closed';
    }

    const createdTime = this.getDateTime(room.createdAt);

    if (createdTime) {
      const hoursPassed =
        (Date.now() - createdTime) / (1000 * 60 * 60);

      if (hoursPassed >= this.autoCloseHours) {
        return 'Closed';
      }
    }

    return 'Waiting';
  }

  private getDateTime(value?: string): number | null {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.getTime();
  }

  private formatCreatedDate(value?: string): string {
    if (!value) return 'N/A';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
    return this.rooms.filter(
      room => room.status === 'Finished' || room.status === 'Closed'
    ).length;
  }

  get totalPlayers(): number {
    return this.rooms.reduce((sum, room) => sum + room.players, 0);
  }

  get filteredRooms(): AdminRoom[] {
    const keyword = this.searchText.trim().toLowerCase();

    return this.rooms.filter(room => {
      const matchesSearch =
        !keyword ||
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
    room.status = 'Closed';
    this.cdr.detectChanges();
  }
}