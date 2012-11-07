
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
	avatar.x = 100;
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

	setInterval(function() {
		if (avatar.ready) {
			avatar.arm.right.rotate(.1);
			avatar.arm.left.rotate(-.1);
			avatar.arm.right.update();
			avatar.arm.left.update();
		}
		fps++;
	}, Math.floor(1000/frameRate));
	setInterval(function() {
		$('#fps').text('FPS '+fps);
		$('#cpu').text('CPU '+stage.cpu + '%');
		fps = 0;
	}, 1000);

});

