
$.ready(function() {

	var width = 300;
	var height = 300;
	var frameRate = 20;

	var stage = tofu.createStage({
		width: width,
		height: height,
		frameRate: frameRate
	});
	stage.show('#main', {title:'Tofu Test'});

	var pixelRatio = window.devicePixelRatio || 1;
	var r = .4 / stage.frameRate;
	var fps = 0;

	var avatar = tofu.createSprite();
	avatar.x = 340;
	avatar.y = 200;
	avatar.update();
	stage.add(avatar);

	var sheet = tofu.createSpriteSheet({
		url: './img/avatar'+pixelRatio*10+'.png'
		//url: './img/avatar20.png'
	}).on('load', function() {

		var self = this;
		console.log(self.sprites);

		var head = self.create('avatar.head');
		var body = self.create('avatar.body');
		var armL = self.create('avatar.arm_l');
		var armR = self.create('avatar.arm_r');
		var legL = self.create('avatar.leg_l');
		var legR = self.create('avatar.leg_r');

		avatar.add(armR);
		avatar.add(legR);
		avatar.add(body);
		avatar.add(head);
		avatar.add(legL);
		avatar.add(armL);
		avatar.ready = true;

		avatar.arm = { right: armR, left: armL };
		avatar.body = body;
		avatar.head = head;
		avatar.leg = { right: legR, left: legL };

	});


	$('#ratio').text('RATIO ' + (pixelRatio || 1));
	$('#cpu').text('CPU 0%');

	var i = 0;
	stage.on('enterframe', function() {
		if (avatar.ready) {
			var legr = avatar.leg.right;
			var legl = avatar.leg.left;
			var t = Math.sin(i += .5 % (Math.PI / 4));
			legr.angle = t;
			legr.update();
			legl.angle = -t;
			legl.update();
			avatar.arm.right.angle = -t;
			avatar.arm.right.update();
			avatar.arm.left.angle = t;
			avatar.arm.left.update();
			avatar.x -= 2;
			avatar.y = t*4 + 200;
			avatar.update();
			if (avatar.x < -40) {
				avatar.x = 340;
			}
		}
		fps++;
	});
	setInterval(function() {
		$('#fps').text('FPS '+fps);
		$('#cpu').text('CPU '+stage.cpu + '%');
		fps = 0;
	}, 1000);

});

