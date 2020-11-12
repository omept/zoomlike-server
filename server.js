const express = require('express');
const app = express();
const { ExpressPeerServer } = require('peer');
const { v4: uuidv4 } = require('uuid');
const server = require('http').Server(app);

const io = require('socket.io')(server);


const main = async () => {

    // add peer server
    const peerServer = ExpressPeerServer(server, {
        debug: true,
        path: '/peerjs'
    });
    // set app view engine
    app.set('view engine', 'ejs');

    // load the files in "public directory"
    app.use(express.static('public'));

    // use peer js server
    // app.use(peerServer);
    app.use(peerServer);

    // define express routes
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
            const { roomID, peerUserId } = data;
            if (roomID) {
                // register the socket to the a channel
                socket.join(roomID); // define roomID as channel to register to
                console.log(' a user connected : ', data);

                // emmit a brodcast to the channel.
                socket.to(roomID).emit("user-connected", peerUserId);
                console.log(' emit user connected passed peerUserId : ', peerUserId, " passing roomID  as :", roomID);
            }
        });

        socket.on('message', (data) => {
            const { ROOM_ID, message } = data;
            if (ROOM_ID) {
                // emmit a brodcast to the channel.
                socket.to(ROOM_ID).broadcast.emit("new-message", { message });

            }
        });

        socket.on('screen-share-init', (data) => {
            const { roomID, peerUserId } = data;
            if (roomID && peerUserId) {
                // emmit a brodcast to the channel.
                socket.to(roomID).broadcast.emit("user-screen-share", { roomID, peerUserId });
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



