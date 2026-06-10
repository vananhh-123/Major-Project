import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type RoomStatus = 'Waiting' | 'Playing' | 'Ended';
type RoomVisibility = 'Public' | 'Private';

interface MultiplayerRoom {
  id: string;
  pin: string;
  quizTitle: string;
  host: string;
  hostAvatar: string;
  players: number;
  maxPlayers: number;
  visibility: RoomVisibility;
  status: RoomStatus;
  startedAt: string;
  duration: string;
}

@Component({
  selector: 'app-admin-multiplayer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-multiplayer.html',
  styleUrl: './admin-multiplayer.css'
})
export class AdminMultiplayer {
  searchText = '';
  activeTab: 'All' | RoomStatus = 'All';
  visibilityFilter = '';

  rooms: MultiplayerRoom[] = [
    {
      id: 'RM001',
      pin: '482913',
      quizTitle: 'English Basic Quiz',
      host: 'Nguyen Van A',
      hostAvatar: 'NguyenVanA',
      players: 18,
      maxPlayers: 30,
      visibility: 'Public',
      status: 'Playing',
      startedAt: '10:20 AM',
      duration: '12m'
    },
    {
      id: 'RM002',
      pin: '193845',
      quizTitle: 'Math Challenge',
      host: 'Tran Thi B',
      hostAvatar: 'TranThiB',
      players: 9,
      maxPlayers: 20,
      visibility: 'Private',
      status: 'Waiting',
      startedAt: '10:35 AM',
      duration: '0m'
    },
    {
      id: 'RM003',
      pin: '774201',
      quizTitle: 'Programming Quiz',
      host: 'Le Minh C',
      hostAvatar: 'LeMinhC',
      players: 24,
      maxPlayers: 40,
      visibility: 'Public',
      status: 'Playing',
      startedAt: '09:58 AM',
      duration: '28m'
    },
    {
      id: 'RM004',
      pin: '650312',
      quizTitle: 'History Quick Test',
      host: 'Pham Hoang D',
      hostAvatar: 'PhamHoangD',
      players: 12,
      maxPlayers: 25,
      visibility: 'Private',
      status: 'Ended',
      startedAt: '09:10 AM',
      duration: '35m'
    },
    {
      id: 'RM005',
      pin: '829104',
      quizTitle: 'Science Speed Run',
      host: 'Sara M.',
      hostAvatar: 'SaraM',
      players: 6,
      maxPlayers: 15,
      visibility: 'Public',
      status: 'Waiting',
      startedAt: '10:45 AM',
      duration: '0m'
    },
    {
      id: 'RM006',
      pin: '508721',
      quizTitle: 'World Geography',
      host: 'Admin Team',
      hostAvatar: 'AdminTeam',
      players: 31,
      maxPlayers: 50,
      visibility: 'Public',
      status: 'Playing',
      startedAt: '08:40 AM',
      duration: '46m'
    }
  ];

  get totalRooms(): number {
    return this.rooms.length;
  }

  get playingRooms(): number {
    return this.rooms.filter(room => room.status === 'Playing').length;
  }

  get waitingRooms(): number {
    return this.rooms.filter(room => room.status === 'Waiting').length;
  }

  get endedRooms(): number {
    return this.rooms.filter(room => room.status === 'Ended').length;
  }

  get totalPlayers(): number {
    return this.rooms.reduce((sum, room) => sum + room.players, 0);
  }

  get filteredRooms(): MultiplayerRoom[] {
    return this.rooms.filter(room => {
      const keyword = this.searchText.toLowerCase();

      const matchesSearch =
        room.id.toLowerCase().includes(keyword) ||
        room.pin.toLowerCase().includes(keyword) ||
        room.quizTitle.toLowerCase().includes(keyword) ||
        room.host.toLowerCase().includes(keyword);

      const matchesTab =
        this.activeTab === 'All' ||
        room.status === this.activeTab;

      const matchesVisibility =
        this.visibilityFilter === '' ||
        room.visibility === this.visibilityFilter;

      return matchesSearch && matchesTab && matchesVisibility;
    });
  }

  setTab(tab: 'All' | RoomStatus): void {
    this.activeTab = tab;
  }

  closeRoom(room: MultiplayerRoom): void {
    room.status = 'Ended';
    room.duration = room.duration === '0m' ? '1m' : room.duration;
  }

  deleteRoom(id: string): void {
    const confirmed = confirm('Are you sure you want to delete this room?');

    if (!confirmed) {
      return;
    }

    this.rooms = this.rooms.filter(room => room.id !== id);
  }
}