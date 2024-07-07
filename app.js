const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const port = 3000;
const socketio = require('socket.io');
const server = http.createServer(app);
const io = socketio(server, {
    pingTimeout: 60000, // 60 seconds timeout for example, adjust as necessary
});

const markers = {}; // To keep track of markers

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    socket.on('send-location', (data) => {
        markers[socket.id] = data;
        io.emit('receive-location', { id: socket.id, ...data });
        console.log('user emitting location', data);
    });

    socket.on('disconnect', () => {
        console.log('a user disconnected', socket.id);
        io.emit("user disconnected", socket.id);
    });
});

app.get('/', (req, res) => {
    res.render('index');
});
//print home for /home route
//do not render it just print "Home"
app.get('/home', (req, res) => {
    res.send("Home");
});


server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
