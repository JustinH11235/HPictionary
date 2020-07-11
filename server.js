'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 3000;

const app = express();
const http = require('http').Server(app);
const server = http.listen(PORT, () => console.log('server is running on port', server.address().port));
// Create a variable {io} used to access methods of socket.io which is connected to the http server
const io = socketIO(http, {
    pingInterval: 2000, // How many ms before the client sends a new ping packet
    pingTimeout: 60000 // How many ms without a pong packet to consider the connection closed.
});

// Setup bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Use ejs as template engine
app.set('view engine', 'ejs');
// Use static folder for .js files
app.use('/static', express.static(__dirname + '/static'));



// Routing Handlers

// Triggered when users access website
app.get('/', (req, res) => res.render('index'));

// Triggered when users submit join game form
// Once we have Join Game and Create Game buttons, we'll need a way to differentiate which one was clicked
app.post('/', (req, res) => {
  res.render('game', {
    username: req.body.username,
    width: width,
    height: height,
    turnTime: turnTime
  });
});
// End Routing Handlers





// Global Game Variables

const width = 400;
const height = 300;
// Create a canvas array of 0's of correct size
var canvas = new Array(width*height*4).fill(0);
var timer;
var curTime;
var curWord;
var gameInProgress = false;
const timeBeforeGame = 5000;
// *Should be set by Create Game eventually*
var numRounds;
// *Should be set by Create Game eventually to 0*
var curRound;
// *Should be set by Create Game eventually*
var turnTime = 90000;
const timeBetweenRounds = 3000;
const timeBetweenTurns = 3000;
// *Should be set by Create Game eventually*
var words;
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

    // The 'init player' message is sent by client after it connects so that we have access to both socket.id and username
    // This handler is what actually creates a player entry in players so that we have all the players stats in one place
    socket.on('init player', user => {
        players[socket.id] = {
            username: user,
            score: 0,
            hadTurn: false,
            guessedCorrectly: false
        };
        
        if (!gameInProgress) {
            startGame(); // TEMPORARY UNTIL WE IMPLEMENT CREATE GAME
        }

        // Needed to make sure players who connect mid-game have an updated canvas, scoreboard, time, and current word
        socket.emit('new canvas', canvas);
        io.emit('scoreboard update', getScoreboard());
        if (curTime) {
            socket.emit('current time', curTime);
        }
        if (curDrawerID) {
            socket.emit('new word', `<b>${players[curDrawerID].username}</b>'s Turn to Draw`);
        }

        console.log(players[socket.id])
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
        io.emit('scoreboard update', getScoreboard());
        console.log('Client disconnected from game room');
    });

    socket.on('new canvas', newArray => {
        // I think the decision is to make {canvas} store a normal JS array, to pass normal JS arrays thru socket.io, and only convert into Uint8ClampedArray and ImageData on client-side when needed
        //console.log(`got new canvas from ${socket.id}, current drawer: ${curDrawerID}`)
        if (socket.id == curDrawerID) {
            canvas = newArray;
            // Send all players updated canvas arr
            socket.broadcast.emit('new canvas', canvas); // Goes to all players EXCEPT drawer
        } else {
            console.log(`new canvas blocked from ${socket.id}, current drawer: ${curDrawerID}`)
        }
    });

    socket.on('new message', newMessage => {
        if (curWord && socket.id != curDrawerID && !players[socket.id].guessedCorrectly) {
            // If there is a word at the moment and the drawer didn't guess and this guesser didn't already get it right...
            if (newMessage.toLowerCase().replace( /\s/g, '') == curWord.toLowerCase().replace( /\s/g, '')) {
                // If the guess is correct...
                players[socket.id].guessedCorrectly = true;
                socket.emit('new message', `<span style="color: green"><b>You:</b> ${curWord}</span>`); // Send word back to guesser
                socket.broadcast.emit('new message', `<span style="color: green"><b>${players[socket.id].username}</b> guessed the word!</span>`); // Send another message to everyone else
                players[socket.id].score += 100;
                io.emit('scoreboard update', getScoreboard().sort((a, b) => {
                    return b.score - a.score;
                }));
                let notAllCorrect = false;
                for (let id in players) {
                    if (id != curDrawerID && !players[id].guessedCorrectly) {
                        notAllCorrect = true;
                        break;
                    }
                }
                if (!notAllCorrect && timer) {
                    // If everyone has guessed correctly and the turn next turn hasn't started yet...
                    clearTimeout(timer);
                    nextTurn();
                }
            } else {
                // If the guess is not correct...
                socket.emit('new message', `<b>You:</b> ${newMessage}`); // Send word back to guesser
                socket.broadcast.emit('new message', `<b>${players[socket.id].username}:</b> ${newMessage}`); // Send another message to everyone else
            }
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

function getScoreboard() {
    var curScoreboard = [];
    for (let id in players) {
        curScoreboard.push({username: players[id].username, score: players[id].score});
    }
    return curScoreboard
}

// End Helper Functions





// Major Functions

// This is the code we will use but we need to trigger it after someone has actually clicked start game after creating a game.
function startGame() {
    gameInProgress = true;
    canvas.fill(0); // Clears canvas
    words = ["Buzz", "Tech Trolley", "Honeycomb Showers", "Atlanta", "The Lion King", "Finding Nemo", "Tech Green", "Tech Tower", "Ramblin' Wreck", "family", "fireman pole", "tow", "spider web", "crow's nest", "sand", "lamp", "enter", "marker", "blush", "shelf", "black hole", "stopwatch", "popcorn", "tricycle", "peanut", "coworker", "read", "porthole", "geyser", "tide", "paper clips", "spot", "taxidermist", "swoop", "scissors", "bathroom scale", "nanny", "sushi", "taxes", "CD", "lifejacket", "waterfall", "rhinoceros", "partner", "obey", "windshield", "castle", "harmonica", "teeth", "husband", "day", "garbage", "check", "skirt", "package", "pharaoh", "hut", "tulip", "cabin", "cash", "wheelie", "lunar rover", "ski lift", "watering can", "bleach", "wick", "fiance", "carpet", "right", "sister", "surround", "yardstick", "chairman", "broccoli", "atlas", "hairspray", "snow", "pizza sauce", "base", "hook", "puppet", "saxophone", "double", "chef", "yolk", "gown", "twig", "stain", "meat", "trapeze", "palace", "hermit crab", "gold", "cucumber", "dustpan", "printer ink", "staple", "handle", "Internet", "bowtie", "globe", "pond", "science", "ashamed", "government", "cougar", "engaged", "lid", "earmuffs", "chestnut", "step", "trip", "fern", "golf", "rodeo", "cobweb", "smile", "plant", "seat", "helicopter", "cousin", "round", "end zone", "state", "flashlight", "blowfish", "rind", "wooly mammoth", "sheep dog", "gum", "athlete", "florist", "chocolate chip cookie", "banjo", "dodgeball", "sash", "goblin", "disc jockey", "peck", "food", "ink", "t-shirt", "clown", "puddle", "grandma", "juice", "chameleon", "pawn", "stroller", "surfboard", "macho", "birthday cake", "driveway", "balance beam", "amusement park", "golf cart", "somersault", "loaf", "dance", "nap", "deer", "water buffalo", "neighborhood", "flamingo", "tail", "elf", "marshmallow", "irrigation", "free", "safe", "garage", "tissue", "wrist", "ski goggles", "traffic jam", "speakers", "twist", "download", "hiss", "dawn", "bike", "equator", "Ferris wheel", "landscape", "koala", "banana peel", "trampoline", "open", "beach", "torch", "cell phone", "cell phone charger", "drugstore", "doghouse", "chin", "popsicle", "paint", "needle", "avocado", "fog", "vanilla", "eye patch", "orange", "invent", "porch", "ringleader", "post office", "myth", "goalkeeper", "safety goggles", "pendulum", "password", "blanket", "reindeer", "hippopotamus", "bug spray", "putty", "sit", "parachuting", "bald eagle", "conveyor belt", "squirrel", "sandpaper", "hen", "student", "locket", "sash", "injury", "librarian", "pen", "corner", "fork", "penguin", "monster", "baseball", "shampoo", "clam", "tie", "race car", "tugboat", "suitcase", "cheat", "three-toed sloth", "van", "bonnet", "janitor", "movie theater", "ditch", "eagle", "radish", "cricket", "airport security", "rattle", "chalk", "middle", "yawn", "sleep", "library", "plumber", "tackle", "chart", "honey", "crust", "trombone", "stage", "cemetery", "scar", "spear", "pilot", "mug", "fax", "outside", "pantry", "germ", "thermometer", "sailboat", "howl", "mascot", "lipstick", "buggy", "wing", "harp", "vest", "limousine", "hoop", "platypus", "edge", "dinner", "starfish", "suit", "dirt", "rainstorm", "toothpaste", "trophy", "beanstalk", "great-grandfather", "bomb", "tag", "dizzy", "sandal", "poison", "swing dancing", "tightrope", "cork", "narwhal", "wreck", "cracker", "wood", "tire", "America", "letter opener", "oxcart", "pulley", "eraser", "flood", "synchronized swimming", "toddler", "art", "bell pepper", "backbone", "competition", "cheeseburger", "circus", "empty", "plantation", "powder", "rock", "bagel", "gallon", "propeller", "squirt gun", "dead end", "chicken coop", "front", "strap", "rose", "banana split", "field", "escalator", "crib", "sunrise", "crow", "truck stop", "doctor", "yodel", "beehive", "sticky note", "Jedi", "telephone booth", "grasslands", "desk", "muffin", "stomach", "stoplight", "cellar", "feast", "steam", "sunburn", "present", "stove", "puzzle", "helium", "flute", "sleeve", "dress", "coin", "scream", "third plate", "tin", "dolphin", "oar", "connect", "quarter", "unicorn", "important", "throne", "baby", "degree", "nail", "hotel", "newspaper", "east", "connection", "jet ski", "grocery store", "ticket", "foam", "wedge", "pea", "geologist", "flu", "barbershop", "seashell", "carousel", "hospital", "saltwater", "firefighter", "thrift store", "parka", "leather", "pelican", "ounce", "motorcycle", "religion", "shake", "drums", "cactus", "hand soap", "cushion", "see", "weight", "level", "extension cord", "elbow", "seed", "farm", "spill", "coastline", "trail", "stow", "organ", "yacht", "brand", "hour", "mop", "hip", "dust bunny", "chess", "dream", "drink", "scarecrow", "half", "cliff", "blueprint", "vein", "mold", "owner", "rowboat", "welder", "earthquake", "teapot", "college", "coconut", "mine", "stingray", "coast", "basket", "RV", "lunch tray", "plow", "chimney", "maze", "flavor", "kettle", "mat", "paperclip", "sweater vest", "fireside", "pigpen", "groom", "lecture", "fiddle", "company", "shower curtain", "piano", "summer", "potato", "printer", "gasoline", "cobra", "hole", "soda", "soccer", "tourist", "crater", "lunchbox", "calm", "lip", "hoof", "scuba diving", "salmon", "sponge", "lumberyard", "prime meridian", "back", "drain", "guitar", "ivy", "chime", "glove", "spell", "screwdriver", "dock", "apathetic", "elope", "picnic", "cook", "rocking chair", "chariot racing", "crown", "back flip", "page", "strawberry", "tusk", "babysitter", "apologize", "tongs", "time", "sandbox", "mysterious", "jewelry", "roof", "pirate", "mouth", "cover", "mitten", "saw", "top hat", "shade", "cliff diving", "carat", "scarf", "stapler", "shrink ray", "carnival", "laundry detergent", "factory", "wax", "deep", "knight", "turkey", "leak", "fin", "poodle", "detective", "fanny pack", "time machine", "pet store", "juggle", "curtains", "landlord", "cello", "sugar", "cul-de-sac", "story", "clique", "drawback", "earache", "cardboard", "easel", "cast", "hummingbird", "propose", "napkin", "letter", "electrical outlet", "movie", "laser", "lace", "reveal", "elephant", "jar", "quadrant", "curtain", "dripping", "pencil", "team", "list", "fur", "sink", "playground", "map", "yo-yo", "honk", "compare", "hair", "retail", "orbit", "panda", "cowboy", "coat", "thief", "musician", "ski", "frost", "school", "manatee", "hill", "rainbow", "baker", "breakfast", "ginger", "flock", "swim", "black belt", "darkness", "eclipse", "desert", "recess", "sunglasses", "hurdle", "crime", "ironing board", "chemical", "maid", "trash can", "grill", "wobble", "economics", "robin", "quartz", "knee", "catalog", "pogo stick", "blue jeans", "vacation", "porcupine", "hot-air balloon", "purse", "song", "last", "correct", "spaceship", "submarine", "tablespoon", "ask", "shark", "mini blinds", "pipe", "crumb", "lap", "braid", "windmill", "snowball", "meteor", "wallet", "gravity", "yard", "mast", "clog", "pickle", "cough", "ping pong", "grandpa", "stage fright", "ribbon", "room", "black widow", "plank", "drive-through", "fungus", "wrench", "dragon", "pain", "envelope", "fruit", "electricity", "signal", "sneeze", "shoulder", "banister", "cattle", "seal", "mouse", "address", "volcano", "railroad", "caviar", "photosynthesis", "crane", "aunt", "coil", "glass", "ladder", "fast food", "mailman"];
    numRounds = 5;
    curRound = 0;
    turnTime = 90000;
    curTime = null;
    curDrawerID = null;
    io.emit('new word', `<b>Game Starting...</b>`);
    timer = setTimeout(nextRound, timeBeforeGame);
}

function endGame() {
    clearTimeout(timer);
    // Forcibly disconnect users from socket.io so that no information can transfer between clients and server
    for (let id in io.sockets.connected) {
        io.sockets.connected[id].disconnect(true);
    }
    gameInProgress = false;
    console.log('Game Ended.')
}

// Every iteration of nextRound() is 1 round, where every player draws once
function nextRound() {
    curWord = null;
    curRound++;
    console.log(`Round ${curRound} started`);

    for (let id in players) {
        players[id].hadTurn = false;
    }
    io.emit('turn end');
    nextTurn();

}

// Every iteration of nextTurn() is 1 player's turn, from the time they become drawer until turn's time is up
function nextTurn() {
    // If there is at least 1 player still in the game
    // Probably should make the game end if there's 1 player also but atm, its when there's none
    if (Object.keys(players).length != 0) {
        if (curDrawerID) {
            io.emit('new word', `<b>The Word Was ${curWord}!`);
            removeCurDrawer();
        }
        curWord = null;
        canvas.fill(0); // Clears canvas
        io.emit('new canvas', canvas); // Send cleared canvas to all players
        io.emit('turn end');
        curTime = null;
        timer = setTimeout(() => {

            for (let id in players) {
                players[id].guessedCorrectly = false;
            }

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
                timer = setTimeout(nextTurn, turnTime);
                io.emit('turn start');
                curTime = Date.now();
                if (words.length != 0) {
                    curWord = words.splice(randInt(0, words.length), 1)[0];
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
        }, timeBetweenTurns);
    }
}


// End Major Functions
