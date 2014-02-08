module.exports = function(app) {
	app.get('/', function(request, response) {
		response.sendfile('../public/index.html');
	});
}