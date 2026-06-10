import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminQuizBank } from './admin-quiz-bank';

describe('AdminQuizBank', () => {
  let component: AdminQuizBank;
  let fixture: ComponentFixture<AdminQuizBank>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminQuizBank]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminQuizBank);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
