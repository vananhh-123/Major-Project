const fs = require('fs');
let code = fs.readFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.html', 'utf8');

const target = \    </div>
  </ng-container>\;

const splitCode = code.split(target);
if (splitCode.length > 1) {
  // Take everything up to the last split (which is right before the missing closing block)
  code = splitCode.slice(0, -1).join(target) + target + \

  <!-- SHARED COUNTDOWN / LOADING SCREEN -->
  <div style="text-align:center; padding-top: 100px" *ngIf="gamePhase === 'loading' || gamePhase === 'countdown'">
      <div *ngIf="gamePhase === 'countdown'">
          <h1 style="font-size: 100px; color:#7C3AED">{{ countdown }}</h1>
          <p style="font-size: 24px; color: #1A1033; font-weight: bold;">Get ready!</p>
      </div>
      <div *ngIf="gamePhase === 'loading'">
          <h2 style="color: #6D28D9;">Waiting for host to start...</h2>
      </div>
  </div>

</div>
\;
}

// Fix the extra closing tags error by removing one </div>
code = code.replace(/    <\/div>\\s*<\/ng-container>/, '</ng-container>');

fs.writeFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.html', code);
