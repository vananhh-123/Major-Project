import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoloLobby } from './solo-lobby';

describe('SoloLobby', () => {
  let component: SoloLobby;
  let fixture: ComponentFixture<SoloLobby>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoloLobby],
    }).compileComponents();

    fixture = TestBed.createComponent(SoloLobby);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
