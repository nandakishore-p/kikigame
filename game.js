// ✅ game.js - NO Firebase Config Here (Already in index.html)

// ✅ Create a new room
function createRoom() {
    let roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("Creating room with code:", roomCode);

    database.ref("rooms/" + roomCode).set({
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        players: 1
    }).then(() => {
        alert(`Room created! Share this code: ${roomCode}`);
    }).catch(error => {
        console.error("Error creating room:", error);
    });
}

// ✅ Join a room
function joinRoom() {
    let roomCode = document.getElementById("roomCode").value;
    let roomRef = database.ref("rooms/" + roomCode);

    roomRef.once("value", (snapshot) => {
        if (snapshot.exists()) {
            let data = snapshot.val();
            if (data.players === 1) {
                roomRef.update({ players: 2 });
                alert("Joined room! Waiting for game start...");
            } else {
                alert("Room is full!");
            }
        } else {
            alert("Room not found!");
        }
    }).catch(error => {
        console.error("Error joining room:", error);
    });
}

// ✅ Auto-delete rooms after 2 minutes
setInterval(() => {
    let now = Date.now();
    database.ref("rooms").once("value", (snapshot) => {
        snapshot.forEach((child) => {
            let data = child.val();
            if (data.createdAt && (now - data.createdAt) > 120000) { // 2 min
                database.ref("rooms/" + child.key).remove();
            }
        });
    }).catch(error => {
        console.error("Error deleting old rooms:", error);
    });
}, 30000); // Check every 30 sec

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 }, // Basic gravity for physics
            debug: true // Set to false in production
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let player1, player2, rope;

const game = new Phaser.Game(config);

function preload() {
    this.load.image('player', 'assets/player.png'); // Player sprite
    this.load.image('ground', 'assets/ground.png'); // ✅ Load ground image
}

function create() {
    const ground = this.physics.add.staticGroup();
    let groundSprite = ground.create(400, 580, 'ground');
    groundSprite.setScale(0.5).refreshBody();
    groundSprite.body.setSize(groundSprite.displayWidth, groundSprite.displayHeight / 3);
    groundSprite.body.setOffset(0, groundSprite.displayHeight / 10);

    player1 = this.physics.add.sprite(200, 300, 'player').setScale(0.2).setCollideWorldBounds(true);
    player1.body.setSize(player1.width * 0.5, player1.height * 0.5);
    
    player2 = this.physics.add.sprite(600, 300, 'player').setScale(0.2).setCollideWorldBounds(true);
    player2.body.setSize(player2.width * 0.5, player2.height * 0.5);
    
    this.physics.add.collider(player1, ground);
    this.physics.add.collider(player2, ground);
    this.physics.add.collider(player1, player2);

    rope = this.add.graphics({ lineStyle: { width: 4, color: 0xffffff } });
    this.cursors = this.input.keyboard.createCursorKeys();

    // ✅ Listen for Player 2 movement from Firebase
    db.collection("rooms").doc(currentRoomCode).onSnapshot((doc) => {
        if (doc.exists) {
            let data = doc.data();
            if (data.player2) {
                player2.setPosition(data.player2.x, data.player2.y);
            }
        }
    });
}

function update() {
    // ✅ Draw the rope between players
    rope.clear();
    rope.lineBetween(player1.x, player1.y, player2.x, player2.y);

    // ✅ Ensure Player 1 can move
    let speed = 160;
    if (this.cursors.left.isDown) {
        player1.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
        player1.setVelocityX(speed);
    } else {
        player1.setVelocityX(0);
    }

    // ✅ Jumping (Only if touching the ground)
    if (this.cursors.up.isDown && player1.body.touching.down) {
        player1.setVelocityY(-300);
    }

    // ✅ Send Player 1's position to Firebase
    let roomCode = localStorage.getItem("roomCode"); // Get room code from storage
    if (roomCode) {
        database.ref("rooms/" + roomCode + "/player1").set({
            x: player1.x,
            y: player1.y
        });
    }

    // ✅ Listen for Player 2's movement from Firebase
    if (roomCode) {
        database.ref("rooms/" + roomCode + "/player2").on("value", (snapshot) => {
            let data = snapshot.val();
            if (data) {
                player2.setPosition(data.x, data.y);
            }
        });
    }
}
