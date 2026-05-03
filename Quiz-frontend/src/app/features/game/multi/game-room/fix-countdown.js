const fs = require('fs');
let code = fs.readFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.html', 'utf8');

// Change host-layout visibility
code = code.replace(
  /<div class="host-layout" \*ngIf="gamePhase !== 'loading' && currentQuestion">/g,
  '<div class="host-layout" *ngIf="(gamePhase === \\'question\\' || gamePhase === \\'answer_reveal\\') && currentQuestion">'
);

// Remove player countdown block
code = code.replace(
  /      <!-- Màn hình ch? n?u phase load -->\s*<div style="text-align:center; padding-top: 100px" \*ngIf="gamePhase === 'loading' \|\| gamePhase === 'countdown'">[\s\S]*?<\/div>\s*<\/div>/g,
  ''
);

// We'll append it before the very last </div> which closes gr-root
code = code.replace(
  /<\/div>\s*$/g,
  \
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
</div>\
);

// Now fix the text replacement we missed
fs.writeFileSync('C:/Users/Hung/MajorProject/Quiz-frontend/src/app/features/game/multi/game-room/game-room.html', code);
