const fs = require('fs');
let code = fs.readFileSync('sockets/hub.go', 'utf8');
code = code.replace(
  'fmt.Printf("[ROOM %s] %s answered Q%v. Correct: %v\\n", roomID, client.UserID, int(questionIdx), isCorrect)',
  `h.sendToClient(roomID, state.HostID, Message{
                Action: "player_answered",
                RoomID: roomID,
                UserID: "SYSTEM",
                Data:   map[string]interface{}{"userId": client.UserID},
        })

        fmt.Printf("[ROOM %s] %s answered Q%v. Correct: %v\\n", roomID, client.UserID, int(questionIdx), isCorrect)`
);
fs.writeFileSync('sockets/hub.go', code);
