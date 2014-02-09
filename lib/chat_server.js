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
		updateRoomList(socket);
		disconnectHandler(socket);
	});
}

function chooseNameHandler(socket) {
	socket.emit('chooseName');
	socket.on('nameChosen', function(data) {
		var name = data.name;
		if( namesChosen.indexOf( name ) !== -1 ) {
			socket.emit('nameTaken');
		} else {
			users[socket.id] = name;
			namesChosen.push(name);
			socket.emit('nameSuccess', {
				name: name
			});
			socket.join('Lobby');
			currentRoom[socket.id] = 'Lobby';
			socket.emit('roomJoined', { room: 'Lobby' });
			updateGuestList('Lobby');
			socket.broadcast.to('Lobby').emit('incomingGuest', { name : name } );
		}
	});
}

function joinRoomHandler(socket) {
	socket.on('joinRoom', function(data) {
		var room = data.room,
			previousRoom = currentRoom[socket.id],
			guests;

		socket.broadcast.to(previousRoom).emit('departingGuest', 
					{ name : users[socket.id] });
		socket.leave(previousRoom);
		currentRoom[socket.id] = room;
		socket.join(room);
		socket.broadcast.to(room).emit('incomingGuest', 
					{ name : users[socket.id] });

		socket.emit('roomJoined', { room : room });

		guests = updateGuestList(room);

		guests.forEach( function(guest) {
			console.log(guest);
		});

		if( guests.length === 1 ) {
			socket.emit('message', { message : 'You are the first person in this room.'});
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
		var room = currentRoom[socket.id],
			user = users[socket.id];
		socket.broadcast.to(room).emit('message', { message : '<strong>' +
					user +  ':</strong> ' + data.message });
	});
}

function updateGuestList(room) {
	var guests = io.sockets.clients(room);

	guests = guests.map( function(guest) {
		return users[guest.id];
	});

	io.sockets.in(room).emit('updateGuestList', { guests: guests });

	return guests;
}

function updateRoomList(socket) {
	socket.on('updateRooms', function() {
		var rooms = findUnique(currentRoom);
		socket.emit('updateRoomList', { rooms : rooms });
	});
}

function findUnique( collection ) {
	var result = [],
		uniqueSet = {},
		room;

	for( item in collection ) {
		room = collection[item];
		uniqueSet[room] = 1;
	}

	for( room in uniqueSet ) {
		result.push(room);
	}

	return result;
}

// pull out rooming join notification as it's own function
// pull out leaving room as well











