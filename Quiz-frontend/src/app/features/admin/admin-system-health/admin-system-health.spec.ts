import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSystemHealth } from './admin-system-health';

describe('AdminSystemHealth', () => {
  let component: AdminSystemHealth;
  let fixture: ComponentFixture<AdminSystemHealth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSystemHealth],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSystemHealth);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
