const express = require('express');
const app = express();
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const server = require('http').Server(app);



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

    server.listen(3030);
}

main().catch(e => console.log(e));



