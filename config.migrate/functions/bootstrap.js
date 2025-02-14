'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/3.0.0-beta.x/concepts/configurations.html#bootstrap
 */

// Toranova: edited for use of socketio together
module.exports = async () => {

	//uses nextTick, because strapi.server is undefined
	//for some reasons
	//see https://github.com/strapi/strapi/issues/5869
	process.nextTick( () => {
	// import socket io
	var io = require('socket.io')(strapi.server)

	// listen for user connection
	io.on('connection', function(socket){
		strapi.log.debug('client connected')

		//listen for map initial data request
		socket.on('map/init', () => {
			strapi.models['draw-line'].query({
			}).fetchAll().then( lines => {
				// sends the line data
				strapi.log.debug('map/line/data sent')
				socket.emit('map/line/data',JSON.stringify(lines))
			})

			strapi.models['alert'].query( qb =>{
				qb.where('Reason',null)
				qb.limit(100)
			}).fetchAll().then( nalerts => {
				strapi.log.debug('map/alert/data sent')
				socket.emit('map/alert/data',JSON.stringify(nalerts))
			})
		})

		//listen for map initial data request
		socket.on('focus/init', (msg) => {
			if(msg){
				msg = JSON.parse(msg)
			}else{
				msg = {count: 10}
			}

			strapi.models['alert'].query( qb => {
				qb.where('Reason',null)
				qb.limit( msg.count || 10 )
			}).fetchAll({
				withRelated: ['fence_segment','fence_segment.fence_host',
					'Attachment','fence_host','alert_model']
			}).then( nalerts => {
				strapi.log.debug('focus/alert/data sent')
				socket.emit('focus/alert/data',JSON.stringify(nalerts))
			})

			/*
			strapi.models['alert'].where({
				Reason: null
			}).fetchAll({
				withRelated:
				['fence_segment','fence_segment.fence_host',
				'Attachment','fence_host','alert_model']
			}).then( nalerts => {
				strapi.log.debug('focus/alert/data sent')
				socket.emit('focus/alert/data',JSON.stringify(nalerts))
			})
			*/
		})

		socket.on('focus/live', (msg) => {
			msg = JSON.parse(msg)

			if( msg.command == 'stop' ){
				var livecom = {
					fsegid: null,
					video: msg.vnum,
					mode: msg.command,
					url:null,
				}
				strapi.ssmqtt.publish('camlive', JSON.stringify(livecom))
				return
			}

			strapi.query('fence-segment')
			.model.query(qb => {
				qb.where('id', msg.fseg || 0);
			}).fetch({require:true}).then( (sr) => {
				const s = sr.toJSON();
				if(s.ip_camera === null){
					// no cameras
				}else{
					strapi.query('ip-camera')
					.model.query(qb => {
						qb.where('id', s.ip_camera.id);
					}).fetch().then( (cr) => {
						const e = cr.toJSON();
						//craft a MQTT packet
						var nopro = e.Domain.split(/:(.+)/)[1]
						var livecom = {
							fsegid: msg.fseg,
							video: msg.vnum,
							mode: msg.command,
							url:`rtsp:${nopro}${e.ip_camera_model.StreamPath}`,
						}
						if(e.UseDefaultLogin){
							livecom.user = e.ip_camera_model.GlobalUsername
							livecom.pass = e.ip_camera_model.GlobalPassword
						}else{
							livecom.user = e.Username
							livecom.pass = e.Password
						}
						strapi.ssmqtt.publish('camlive', JSON.stringify(livecom))
					});
				}
			}).catch( err => {
				strapi.log.error(`focus/live ${err.message}`)
			});
		})

		//forward this message to map/alert/highlight
		socket.on('focus/alert/highlight', (msg) => {
			socket.broadcast.emit('map/alert/highlight', msg)
			strapi.log.debug('sync focus-map',msg)
		})

		//list for down initial data request
		socket.on('down/init', () => {
			strapi.models['draw-line'].query({
			}).fetchAll().then( lines => {
				// sends the line data
				strapi.log.debug('down/line/data sent')
				socket.emit('down/line/data',JSON.stringify(lines))
			})

			strapi.models['fence-host'].where({
				RepliedPing: false
			}).fetchAll({
			}).then( nhosts => {
				strapi.log.debug('down/alert/data sent')
				socket.emit('down/alert/data',JSON.stringify(nhosts))
			})
		})


		// listen for user diconnect
		socket.on('disconnect', () => strapi.log.debug('client disconnected'))
	});

	// register socket io inside strapi main object to use it globally anywhere
	strapi.io = io
	})
};
