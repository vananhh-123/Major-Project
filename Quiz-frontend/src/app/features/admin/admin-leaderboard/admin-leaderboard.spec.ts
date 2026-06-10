import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminLeaderboard } from './admin-leaderboard';

describe('AdminLeaderboard', () => {
  let component: AdminLeaderboard;
  let fixture: ComponentFixture<AdminLeaderboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLeaderboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLeaderboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
