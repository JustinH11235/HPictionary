'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 3000;
// const INDEX = '/index.html';

const app = express();
const http = require('http').Server(app);
const server = http.listen(PORT, () => console.log('server is running on port', server.address().port));
const io = socketIO(http);

// Setup bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))

// Use ejs as template engine
app.set('view engine', 'ejs');
// Use static folder for .js files
app.use('/static', express.static(__dirname + '/static'));

// Needed to be able to create starting, blank canvas
const Canvas = require('canvas')


// Routing Handlers
app.get('/', (req, res) => res.render('index'));

app.post('/', (req, res) => {
  res.render('game', {
    username: req.body.username
  });
});


// Global Game Variables
const width = 600;
const height = 200;
const ctx = Canvas.createCanvas(width, height).getContext('2d')

var canvas = ctx.createImageData(width, height);
var drawerID;


// Socket.io Handlers
io.on('connection', (socket) => {
    console.log('Client entered game room');

    //TODO
    drawerID = socket.id;//TEMPORARY, NEED TO RANDOMLY SET DRAWER AFTER WE IMPLEMENT CREATING A NEW GAME IN INDEX AND STARTING A GAME WHEN EVERYONE IS IN.

    socket.on('disconnect', () => {
        console.log('Client disconnected from game room');
    });

    socket.on('new canvas', newCanvas => {
        console.log('got new canvas')
        if (socket.id == drawerID) {
            canvas = newCanvas;
            console.log(newCanvas)
            io.emit('new canvas', newCanvas); // Goes to ALL players
        } else {
            console.log(`new canvas blocked from ${socket.id}, current player: ${drawerID}`)
        }
    });

    //NEW SOCKET HANDLER HERE

});






// old code below

// setInterval(() => {
//   updateBoard();

//   // Send individualized boards
//   for (let id in players) {
//     let pos = players[id].body[players[id].length - 1];
//     let newBoard = JSON.parse(JSON.stringify(blackBoard));
//     for (let i = pos.y - CLIENT_YRANGE; i <= pos.y + CLIENT_YRANGE; i++) {
//       for (let j = pos.x - CLIENT_XRANGE; j <= pos.x + CLIENT_XRANGE; j++) {
//         if (j >= 0 && j < WIDTH && i >= 0 && i < HEIGHT) {
//           newBoard[i + CLIENT_YRANGE - pos.y][j + CLIENT_XRANGE - pos.x] = board[i][j];
//         }
//       }
//     }
//     io.sockets.connected[id].emit('new canvas', newBoard);
//   }

//   if (updateScoreboard) {
//     let scoreboard = [];
//     let counter = 0;
//     for (let id in players) {
//       if (counter >= 5)
//         break;
//       scoreboard.push({username: players[id].username, score: players[id].length, color: players[id].color})
//       counter++;
//     }
//     for (let id in bots) {
//       if (counter >= 5)
//         break;
//       scoreboard.push({username: bots[id].username, score: bots[id].length, color: bots[id].color})
//       counter++;
//     }
//     io.emit('scoreboard update', scoreboard.sort((a, b) => {
//       return b.score - a.score;
//     }))
//     updateScoreboard = false;
//   }
// }, 1000 / 7);
