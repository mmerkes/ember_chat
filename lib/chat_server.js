var socketio = require('socket.io'),
	io,
	users = {},
	currentRoom = {},
	namesChosen = [];

module.exports = function(server) {
	io = socketio.listen(server);
	io.set('log level', 1);

	io.sockets.on('connection', function(socket) {
		chooseNameHandler(socket);
		joinRoomHandler(socket);
		messageHandler(socket);

		disconnectHandler(socket);
	});
}

function chooseNameHandler(socket) {
	socket.emit('chooseName');
	socket.on('nameChosen', function(data) {
		if( namesChosen.indexOf( data.name ) !== -1 ) {
			socket.emit('nameTaken');
		} else {
			users[socket.id] = data.name;
			namesChosen.push(data.name);
			socket.emit('nameSuccess', {
				name: data.name
			});
			socket.join('Lobby');
			currentRoom[socket.id] = 'Lobby';
			socket.emit('message', { message : 'You are now in the lobby.'});
		}
	});
}

function joinRoomHandler(socket) {
	socket.on('joinRoom', function(data) {
		var room = data.room,
			previousRoom = currentRoom[socket.id];
		socket.broadcast.to(previousRoom).emit('departingGuest', 
					{ name : users[socket.id] });
		socket.leave(previousRoom);
		currentRoom[socket.id] = room;
		socket.join(room);
		socket.broadcast.to(room).emit('incomingGuest', 
					{ name : users[socket.id] });
		socket.emit('roomJoined', { room : room });

		var guests = io.sockets.clients(room),
			message = '';

		if( guests.length === 1 ) {
			socket.emit('message', { message : 'You are the first person in this room.'});
		} else {
			guests.forEach( function( client ) {
				if( client === socket) {
					return;
				} else if ( message === '' ) {
					message += users[client.id];
				} else {
					message += ', ' + users[client.id];
				}
			});

			if( guests.length === 2) {
				message += ' is currently in the room.';
			} else {
				message += ' are currently in the room.'
			}

			socket.emit('message', { message: message });
		}
	});
}

function disconnectHandler(socket) {
	socket.on('disconnect', function() {
		var room = currentRoom[socket.id],
			username = users[socket.id];
		io.sockets.in(room).emit('departingGuest',
			        { name : username });

		delete currentRoom[socket.id];
		delete users[socket.id];
		delete namesChosen[ namesChosen.indexOf(username)];
	});
}

function messageHandler(socket) {
	socket.on('message', function(data) {
		var room = currentRoom[socket.id];
		socket.broadcast.to(room).emit('message', { message : data.message });
	});
}

// pull out rooming join notification as it's own function
// pull out leaving room as well











