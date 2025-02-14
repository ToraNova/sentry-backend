const axios = require('axios').default;

var now = new Date()
//var dstr = now.toLocaleDateString() + now.toLocaleTimeString()
var dstr = now.toISOString()

axios.post('http://localhost:1337/auth/local', {
	identifier: 'Hostuser',
	password: '4dns9af8XR9mPm2',
}).then(response => {
	// Handle success.
	// Request API.
	console.log(response.data.jwt)

	axios.post('http://localhost:1337/alerts',
		{ //data
			"Reason": null,
			"OriginBranch":1,
			"OriginType":1,
			"alert_model":1,
			"fence_segment":1,
			"Details":{
				"Magnitude":"0xFF"
			}
		},
		{
		headers: {
			Authorization: `Bearer ${response.data.jwt}`,
		},
	}).then(response => {
		// Handle success.
		console.log('Data: ', response.data);
	}).catch(error => {
		// Handle error.
		console.log('An error occurred:', error);
	});

}).catch(error => {
	// Handle error.
	console.log('An error occurred:', error);
});
