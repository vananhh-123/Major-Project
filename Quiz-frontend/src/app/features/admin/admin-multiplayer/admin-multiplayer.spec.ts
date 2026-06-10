import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminMultiplayer } from './admin-multiplayer';

describe('AdminMultiplayer', () => {
  let component: AdminMultiplayer;
  let fixture: ComponentFixture<AdminMultiplayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMultiplayer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminMultiplayer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
