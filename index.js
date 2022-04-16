// Require the libraries:
var SocketIOFileUpload = require("socketio-file-upload")
const fs = require('fs')

const express = require('express')
const app = express()
app.use(SocketIOFileUpload.router);

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const http = require('http')
const { Server } = require('socket.io')
const server = http.createServer(app)
const io = new Server(server)
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/uploads'));
app.use(express.json())
app.set('view engine','ejs')

var user = {}
var rooms = ['DefaultRoom']


app.get('/', (req, res) => {
  
    res.render('index')
})

app.get('/game', (req, res) => {
  
    res.render('game');
})

app.post('/game', (req, res) => {
  // JAK PRZESŁAĆ ROOMS DO KLIENTA

    var username = req.body.username;

    res.render('game', {roomlist: rooms, user: username});
})

// app.get('/deleteimage', (req, res) => {
//     console.log(req.query);
//     res.json(req.query.path);
//     fs.unlinkSync(__dirname + "/uploads/" + req.query.path, () => {
        
//     })
// })

io.on("connection", function (socket) {

  console.log("New socket connected: " + socket.id)
  
  socket.on('join', (data) => {
    var room = data.room;
    var username = data.username;
    socket.join(room);
    io.to(room).emit('system-message', {'msg': username + " has joined the " + room})
  })
  
  socket.on('leave', (data) => {
    console.log(data)
    var room = data.room;
    var username = data.name;
    io.to(room).emit('system-message', {'msg': data.name + " has left the " + room})
    socket.leave(room);
  })

  
  // Make an instance of SocketIOFileUpload and listen on this socket:
  

  socket.on('new-user', data => {
    user[socket.id] = data.name
    room = data.room
    socket.to(room).emit('user-connected', data)

 
      console.log("User info: " + user[socket.id])
    
  })

  socket.on('send-chat-message', data => {
    socket.to(data.room).emit('chat-message', { message: data.message, name: user[socket.id] })
  })

  socket.on('send-video', path => {
    socket.to(path.room).emit('display-video', path)
  })

  var uploader = new SocketIOFileUpload();
  uploader.dir = "uploads";
  uploader.listen(socket);

  // Do something when a file is saved:
  uploader.on("saved", function (event) {
      event.file.clientDetail.name = event.file.name; 
  });

  // Error handler:
  uploader.on("error", function (event) {
    console.log("Error from uploader", event);
  });

  socket.on('create-room', (data) => {
    if (rooms.indexOf(data.new_room_name) !== -1) {
      console.log("The room already exsitstst")
    } else {
      console.log(data)
      let room_name = data.new_room_name
      rooms.push(room_name)
      io.emit('new-room-received', data)
    }
  })




});

server.listen(8000, () => {
  console.log("Server is listening on port 8000");
});
