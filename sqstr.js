var app = require('express').createServer();
var io = require('socket.io').listen(app);
var users = [];
var tiles = [];
var mapsize = 100;
var scopex = 25; //half the scope - 1 (offset from character)
var scopey = 10; //same
var teamxnum = 0;
var teamonum = 0;
var roundover = false;
var team1 = 0;
var team2 = 0;
var numplayers = 0;

app.listen(80);
io.set('log level', 1);
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/sqstr.html');
});
app.get('/bot', function (req, res) {
	res.sendfile(__dirname + '/sqstrbot.html');
});


function mapinteractions(newtile, i){
	if (tiles[newtile].occupantid == 0) {
		tiles[users[i].tile].occupantid = 0;
		tiles[users[i].tile].team = users[i].team;
		users[i].tile = newtile;
		tiles[users[i].tile].occupantid = i;
	} else {
		if (users[tiles[newtile].occupantid].team != users[i].team) {
			var attackval = 0;
			var defendval = 0;
			if (users[i].team == 'X') { attackval = Math.floor((Math.random()*(users[i].power * 80))*(users[i].health / (users[i].power * 100))) + team1;
			} else { attackval = Math.floor((Math.random()*(users[i].power * 100))*(users[i].health / (users[i].power * 100))) + team2; }
			if (users[tiles[newtile].occupantid].team == 'X') { defendval = Math.floor((Math.random()*(users[tiles[newtile].occupantid].power * 80))*(users[tiles[newtile].occupantid].health / (users[tiles[newtile].occupantid].power * 100))) + team1;
			} else { defendval = Math.floor((Math.random()*(users[tiles[newtile].occupantid].power * 80))*(users[tiles[newtile].occupantid].health / (users[tiles[newtile].occupantid].power * 100))) + team2; }
			console.log('attacker health ' + users[i].health + ' attacking with ' + attackval);
			console.log('defender health ' + users[tiles[newtile].occupantid].health + ' defending with ' + defendval);
			users[i].health = users[i].health - defendval;
			users[tiles[newtile].occupantid].health = users[tiles[newtile].occupantid].health - attackval;
			console.log('attacker health ' + users[i].health);
			console.log('defender health ' + users[tiles[newtile].occupantid].health);
			if (users[tiles[newtile].occupantid].health <= 0 && users[i].health > 0) {
				//user wins
				console.log('attacker wins');
				tiles[users[i].tile].occupantid = 0;
				tiles[users[i].tile].team = users[i].team;
				users[i].tile = newtile;
				tiles[users[i].tile].occupantid = i;
				users[i].power++;
				users[i].health = users[i].health + Math.floor(Math.random()*(users[i].power * 50));
			}
			if (users[tiles[newtile].occupantid].health > 0 && users[i].health <= 0) {
				//other user wins
				console.log('defender wins');
				tiles[users[i].tile].occupantid = 0;
				users[tiles[newtile].occupantid].power++;
				users[tiles[newtile].occupantid].health = users[tiles[newtile].occupantid].health + Math.floor(Math.random()*(users[tiles[newtile].occupantid].power * 50));
			}
			if (users[tiles[newtile].occupantid].health <= 0 && users[i].health <= 0) {
				//both users die like dumbasses
				console.log('both users died');
				tiles[users[i].tile].occupantid = 0;
				tiles[newtile].occupantid = 0;
			}
		}
	}
}
setInterval(function(){ //game loop
	var xleft = 0;
	var oleft = 0;
	numplayers = 0;
	for (var i = 0; i < users.length; i++) {
		if (users[i].tile != -2) { //checks they want to move and are alive
			if (users[i].move != 0 && users[i].health > 0) {
				if (users[i].move == 37 && users[i].tile > (mapsize - 1)) { //left and not at left edge 37
					mapinteractions((users[i].tile - mapsize),i);
				}
				if ((users[i].move == 38) && ((users[i].tile % mapsize) != 0)) { //up and not at top edge 38
					mapinteractions((users[i].tile - 1),i);
				}
				if (users[i].move == 39 && users[i].tile < ((mapsize * mapsize) - mapsize)) { //right and not at right edge 39
					mapinteractions((users[i].tile + mapsize),i);
				}
				if ((users[i].move == 40) && ((users[i].tile % mapsize) != (mapsize - 1))) { //down and not at bottom edge 40
					mapinteractions((users[i].tile + 1),i);
				}
				users[i].move = 0;
			}
			numplayers++;
		}
	}
	if (roundover == false) {
		for (i = 0; i < users.length; i++) { //second user loop to send out tiles after movements
			if (users[i].tile != -2) {
				var tilestosend = '';
				var playercoordx = Math.floor(users[i].tile / mapsize);
				var playercoordy = users[i].tile % mapsize;
				var mindistance = 1000;
				var minx = 1000;
				var miny = 1000;
				for (var y = playercoordy - scopey; y < playercoordy + (scopey + 1); y++) {
					for (var x = playercoordx - scopex; x < playercoordx + (scopex + 1); x++) {
						if (x < 0 || x > (mapsize - 1) || y < 0 || y > (mapsize - 1)) {
							tilestosend = tilestosend + '#';
						} else {
							if (tiles[((mapsize * x) + y)].occupantid != 0) {
								tilestosend = tilestosend + '<font color = \"' + users[tiles[((mapsize * x) + y)].occupantid].color + '\">' + users[tiles[((mapsize * x) + y)].occupantid].power + '</font>';
								if (x != scopex && y != scopey && users[tiles[((mapsize * x) + y)].occupantid].color != users[i].color) {
									//not sure if scopex and scopey are precisely the location of player
									//check if min
									var xs = 0;
									var ys = 0;
									xs = x - playercoordx;
									xs = xs * xs;
									ys = y - playercoordy;
									ys = ys * ys;
									if (Math.sqrt( xs + ys ) < mindistance) {
										minx = x;
										miny = y;
										mindistance = (Math.sqrt( xs + ys ));
									}
								}
							} else {
								tilestosend = tilestosend + tiles[((mapsize * x) + y)].team;
							}
						}
					}
					tilestosend = tilestosend + '<br />';
				}
				var socket = users[i].sckt;
				var health = users[i].health;
				if (health < 1) health = 'DEAD: You will respawn next round, or you can refresh if you can\\\'t wait';
				socket.emit('map', tilestosend, health, minx, miny, playercoordx, playercoordy);
				if (users[i].health > 0 && users[i].team == 'X') xleft++;
				if (users[i].health > 0 && users[i].team == 'O') oleft++;
			}
		}
	}
	if (xleft == 0 || oleft == 0) { //check round is over
		if (roundover == false) {
			if (teamxnum > 0 && teamonum > 0) { //check there's at least one player on each team
				roundover = true;
				console.log('round over ' + xleft + oleft);
				var winner = '';
				if (xleft > 0) winner = '  Red won  ';
				if (oleft > 0) winner = ' Blue won  ';
				if (xleft < 1 && oleft < 1) winner = ' Stalemate ';
				io.sockets.emit('map', '###################################################<br />###################################################<br />######-----####----###-####-##-####-##-----########<br />######-####-##-####-##-####-##--###-##-####-#######<br />######-####-##-####-##-####-##-#-##-##-####-#######<br />######----####-####-##-####-##-##-#-##-####-#######<br />######-###-###-####-##-####-##-###--##-####-#######<br />######-####-##-####-##-####-##-####-##-####-#######<br />######-####-###----####----###-####-##-----########<br />###################################################<br />###################################################<br />###########----###-####-##------##-----############<br />##########-####-##-####-##-#######-####-###########<br />##########-####-##-####-##-#######-####-###########<br />##########-####-##-####-##----####----#############<br />##########-####-##-####-##-#######-###-############<br />##########-####-###-##-###-#######-####-###########<br />###########----#####--####------##-####-###########<br />###################################################<br />###################<font color=\"#CCA300\">' + winner + '</font>#####################<br />###################################################<br />', '-');
				setTimeout(function(){ 
					filltiles();
					var tempusers = new Array();
					tempusers[0] = { 'tile' : -2 };
					for (i = 1; i < users.length; i++) {
						if (users[i].tile != -2) {
							users[i].sckt.usernum = tempusers.length;
							tempusers.push(users[i]);
							tempusers[tempusers.length - 1].sckt = users[i].sckt;
						}
					};
					users = tempusers;
					for (i = 1; i < users.length; i++) {
						var temptile = Math.floor(Math.random()*(mapsize * mapsize));
						users[i].tile = temptile;
						users[i].health = 100;
						users[i].power = 1;
						users[i].move = 0;
						tiles[temptile].occupantid = i;
					}
					
					roundover = false;
				}, 5000);
			}
		}
	}

},100);
setInterval(function(){
	team1 = 0;
	team2 = 0;
	var unclaimed = 0;
	for (var i = 0; i < tiles.length; i++) {
		if (tiles[i].team == 'X') {
			team1++;
		}
		if (tiles[i].team == 'O') {
			team2++;
		}
		if (tiles[i].team == '-') {
			unclaimed++
		}
	}
	team1 = Math.round((team1 / (mapsize * mapsize))*100);
	team2 = Math.round((team2 / (mapsize * mapsize))*100);
	io.sockets.emit('updatestats', team1, team2, numplayers);
},1000);
setInterval(function(){
	//kick everyone
	for (var i = 1; i < users.length; i++) {
		if (users[i].keepalive == false && users[i].tile != -2) {
			console.log('user timed out')
			tiles[users[i].tile].occupantid = 0;
			users[i].tile = -2;
			if (users[i].team == 'X') {
				teamxnum--;
			} else {
				teamonum--;
			}
			users[i].sckt.emit('map', '<font color=\"#CCA300\">throw new</font> Error(\"TIMED OUT -- Please refresh page to play again\")\;', '-');
		} else { users[i].keepalive = false; };
	}
},600000);
users[users.length] = { 'tile' : -2 }; //otherwise player 1 has an id of 0
filltiles();
function filltiles(){
	//add flags, powerups
	for (var j = 0; j < (mapsize * mapsize); j++) {
		tiles[j] = {
			'occupantid' : 0,
			'team' : '-'
		};
	}
}
io.sockets.on('connection', function (socket) {
	socket.group = 1;
	socket.usernum = users.length;
	//TODO do a loop to check if temptile is already occupied
	//move them to their side
	var temptile = Math.floor(Math.random()*(mapsize * mapsize));
	var team = '';
	if (teamxnum > teamonum) {
		team = 'O';
		color = '#3366FF';
		teamonum++;
	} else {
		team = 'X'
		color = 'red';
		teamxnum++;
		//this gives slight advantage to X because it defaults to them on ==
	}
	users[users.length] = {
		'sckt' : socket,
		'tile' : temptile, //starting tile
		'health' : 100,
		'power' : 1,
		'move' : 0,
		'color' : color,
		'team' : team
	}
	users[socket.usernum].keepalive = true;
	tiles[temptile].occupantid = socket.usernum;
	console.log('new player');
	socket.on('playermove', function(movement){
		users[socket.usernum].keepalive = true;
		movement = parseInt(parseFloat(movement),10);
		if (movement > 36 && movement < 41) { 
			users[socket.usernum].move = movement
		}
	});
	socket.on('disconnect', function(){
		try {
			tiles[users[socket.usernum].tile].occupantid = 0;
			if (users[socket.usernum].team == 'X') {
				teamxnum--;
			} else {
				teamonum--;
			}
			users[socket.usernum].tile = -2
			console.log('player left');
		} catch(e) {
			console.log('someone left without signing in');
			return
		}
		socket.leave(socket.group);
	});
});
