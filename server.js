const express = require('express');
const app = express();
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const server = require('http').Server(app);

const io = require('socket.io')(server);



const main = async () => {
    // set app view engine
    app.set('view engine', 'ejs');

    // load the files in "public directory"
    app.use(express.static('public'));

    app.get("/", (req, res) => {
        const roomId = uuidv4();
        res.redirect(`/${roomId}`);
    });


    app.get("/:room", (req, res) => {
        res.render('room', { roomId: req.params.room });
    });

    // listen to socket connections
    io.on('connection', (socket) => {

        socket.on('join-room', (data) => {
            const roomID = data.roomID;
            if (roomID) {
                // register the socket to the a channel
                socket.join(roomID); // define roomID as channel to register to
                console.log(' a user connected : ', data);

                // emmit a brodcast to the channel.
                socket.to(roomID).emit("user-connected");

            }
        });

        // catch socket error before it catches us unaware
        socket.on('error', (reason) => {
            console.log(reason); // prints the message associated with the error, e.g. "thou shall not pass" in the example above
        });

    });


    server.listen(3030);
}

main().catch(e => console.log(e));



