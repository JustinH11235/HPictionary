'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 3000;

const app = express();
const http = require('http').Server(app);
const server = http.listen(PORT, () => console.log('server is running on port', server.address().port));
// Create a variable {io} used to access methods of socket.io which is connected to the http server
const io = socketIO(http);

// Setup bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Use ejs as template engine
app.set('view engine', 'ejs');
// Use static folder for .js files
app.use('/static', express.static(__dirname + '/static'));

// Needed to use canvas methods in node without actually creating an html canvas
const Canvas = require('canvas');




// Routing Handlers

// Triggered when users access website
app.get('/', (req, res) => res.render('index'));

// Triggered when users submit join game form
// Once we have Join Game and Create Game buttons, we'll need a way to differentiate which one was clicked
app.post('/', (req, res) => {
  res.render('game', {
    username: req.body.username,
    width: width,
    height: height
  });
});
// End Routing Handlers





// Global Game Variables

const width = 400;
const height = 300;
const ctx = Canvas.createCanvas(width, height).getContext('2d');
// Create a canvas array of 0's of correct size
var canvas = new Array(width*height*4).fill(0);
var timer;
var curWord = '&nbsp';
var gameInProgress = false;
// *Should be set by Create Game eventually*
var numRounds = 5;
// *Should be set by Create Game eventually*
var curRound = 0;
// *Should be set by Create Game eventually*
var timeBetweenRounds = 3000;
// *Should be set by Create Game eventually*
var timeBetweenTurns = 90000;
// *Should be set by Create Game eventually*
var words = ['werewolf', 'buzz', 'tech tower', 'the sun', 'ramblin wreck'];
var players = {};
/* Players object structure: key=socketid, value={username, score, hadTurn}; Access using players[socketid]
{
    socketid1: {
        username: 'player 1',
        score: 0,
        hadTurn: false
    },
    socketid2: {
        ...
    }
}
*/
var curDrawerID = null;
// End Global Game Variables





// Socket.io Handlers
io.on('connection', (socket) => {
    console.log('Client entered game room');
    // Needed to make sure players who connect mid-game have an updated canvas and current word
    socket.emit('new canvas', canvas);
    if (curDrawerID) {
        socket.emit('new word', `<b>${players[curDrawerID].username}</b>'s Turn to Draw`);
    } else {
        socket.emit('new word', '&nbsp');
    }

    // The 'init player' message is sent by client after it connects so that we have access to both socket.id and username
    // This handler is what actually creates a player entry in players so that we have all the players stats in one place
    socket.on('init player', user => {
        players[socket.id] = {
            username: user,
            score: 0,
            hadTurn: false
        };
        console.log(players[socket.id])
        if (!gameInProgress) {
            startGame(); // TEMPORARY UNTIL WE IMPLEMENT CREATE GAME
        }
    });

    socket.on('disconnect', () => {
        if (socket.id in players) {
            delete players[socket.id];
        }
        if (curDrawerID == socket.id) {
            curDrawerID = null;
        }
        // If there is 1 or less players left in the game and a game is running
        if (gameInProgress && Object.keys(players).length <= 1) {
            endGame();
        }
        console.log('Client disconnected from game room');
    });

    socket.on('new canvas', newArray => {
        // I think the decision is to make {canvas} store a normal JS array, to pass normal JS arrays thru socket.io, and only convert into Uint8ClampedArray and ImageData on client-side when needed
        // console.log(`got new canvas from ${socket.id}, current drawer: ${curDrawerID}`)
        if (socket.id == curDrawerID) {
            canvas = newArray;
            // Send all players updated canvas arr
            io.emit('new canvas', canvas); // Goes to ALL players
        } else {
            console.log(`new canvas blocked from ${socket.id}, current drawer: ${curDrawerID}`)
        }
    });

    //EMPTY SPACE FOR NEW SOCKET HANDLER

});
// End Socket.io Handlers





// Helper Functions
function randInt(incMin, exclMax) {
    return Math.floor(Math.random() * (exclMax - incMin)) + incMin;
}

function setNextDrawer(id) {
    io.sockets.connected[id].emit('give drawer');
    curDrawerID = id;
    players[id].hadTurn = true;
}

function removeCurDrawer() {
    if (curDrawerID) {
        io.sockets.connected[curDrawerID].emit('take drawer');
        curDrawerID = null;
    }
}

// End Helper Functions





// Major Functions

// This is the code we will use but we need to trigger it after someone has actually clicked start game after creating a game.
function startGame() {
    gameInProgress = true;
    nextRound();
}

function endGame() {
    io.emit('new word', '<b><u>Game Over!</u></b>');
    // Forcibly disconnect users from socket.io so that no information can transfer between clients and server
    clearTimeout(timer);
    for (let id in io.sockets.connected) {
        io.sockets.connected[id].disconnect(true);
    }
    gameInProgress = false;
    console.log('Game Ended.')
}

// Every iteration of nextRound() is 1 round, where every player draws once
function nextRound() {
    curRound++;
    console.log(`Round ${curRound} started`);

    // *Code* everything that happens in 1 round
    for (let id in players) {
        players[id].hadTurn = false;
    }
    nextTurn();

}

// Every iteration of nextTurn() is 1 player's turn, from the time they become drawer until turn's time is up
function nextTurn() {
    // If there is at least 1 player still in the game
    // Probably should make the game end if there's 1 player also but atm, its when there's none
    if (Object.keys(players).length != 0) {
        removeCurDrawer();
        canvas.fill(0); // Clears canvas
        io.emit('new canvas', canvas); // Send cleared canvas to all players
        var found = false;
        // Set the drawer to first player where hadTurn == false
        for (let id in players) {
            if (!players[id].hadTurn) {
                setNextDrawer(id);
                found = true;
                break;
            }
        }

        // If all players have had a turn, end round.
        if (!found) {
            console.log('did not find any remaining players')
            removeCurDrawer();
            canvas.fill(0); // Clears canvas
            io.emit('new canvas', canvas); // Send cleared canvas to all players
            console.log(`Round ${curRound} ended`);

            if (curRound < numRounds) {
                timer = setTimeout(nextRound, timeBetweenRounds);
                io.emit('new word', `<b>End of Round ${curRound}...</b>`);
            } else {
                endGame();
            }
            return;
        } else {
            // If a player was found, start a new turn in 25s and tell players new word
            timer = setTimeout(nextTurn, timeBetweenTurns)
            if (words.length != 0) {
                curWord = words.splice(randInt(0, words.length), 1);
                for (let id in io.sockets.connected) {
                    if (id == curDrawerID) {
                        io.sockets.connected[id].emit('new word', `Your Turn to Draw: <b>${curWord}</b>`);
                    } else {
                        io.sockets.connected[id].emit('new word', `<b>${players[curDrawerID].username}</b>'s Turn to Draw`);
                    }
                }

            } else {
                io.emit('new word', 'Ran out of words :(');
            }
            console.log(`Turn started. Username: ${players[curDrawerID].username}`)
        }
    }
}


// End Major Functions

















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
