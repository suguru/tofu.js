
$.ready(function() {

	var width = 320;
	var height = 356;
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
	var ratio = pixelRatio*10;

	var bg = tofu.createGraphics({
		width: 320, height: 450
	});
	var graphics = bg.graphics;
	graphics.beginPath();
	// sky
	var grad = graphics.createLinearGradient(0,0,0,225);
	grad.addColorStop(0,'rgb(40,203,203)');
	grad.addColorStop(1,'rgb(206,229,229)');
	graphics.fillStyle = grad;
	graphics.fillRect(0,0,320,225);
	bg.update(true);
	
	var floor = tofu.createGraphics({
		width: 320, height: 140
	});
	floor.y = 220;
	var floorImage = new Image();
	floorImage.addEventListener('load', function() {
		floor.fillImage(floorImage, 'repeat-x', 0, 0, 320, floorImage.height);
		floor.update(true);
	});
	floorImage.src = './img/grass'+ratio+'.png';

	var house = tofu.createBitmap({
		url: './img/house'+ratio+'.png'
	});
	house.x = 10;
	house.y = 106;

	stage.add(bg);
	stage.add(house);
	stage.add(floor);

	var avatar = tofu.createSprite();
	avatar.x = 340;
	avatar.update();
	stage.add(avatar);

	function Avatar(sheet) {
		var self = this;
		var head = sheet.create('avatar.head');
		var body = sheet.create('avatar.body');
		var armL = sheet.create('avatar.arm_l');
		var armR = sheet.create('avatar.arm_r');
		var legL = sheet.create('avatar.leg_l');
		var legR = sheet.create('avatar.leg_r');
		var sprite = tofu.createSprite();
		sprite.add(armR,legR,body,head,legL,armL);
		sprite.update();
		self.sprite = sprite;
		self.arm = { right: armR, left: armL };
		self.leg = { right: legR, left: legL };
		self.body = body;
		self.head = head;
	}

	var avatar = null;
	var avatar2 = null;
	var avatar3 = null;

	var sheet = tofu.createSpriteSheet({
		url: './img/avatar'+ratio+'.png'
		//url: './img/avatar20.png'
	}).on('load', function() {
		var self = this;
		avatar = new Avatar(self);
		stage.add(avatar.sprite);
		avatar2 = new Avatar(self);
		stage.add(avatar2.sprite);
		avatar2.sprite.x = 180;
		avatar2.sprite.y = 300;
		avatar3 = new Avatar(self);
		stage.add(avatar3.sprite);
	});

	$('#ratio').text('RATIO ' + (pixelRatio || 1));
	$('#cpu').text('CPU 0%');

	var i = 0;
	var j = 0;
	stage.on('enterframe', function() {
		if (avatar != null) {
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
			var sprite = avatar.sprite;
			sprite.x -= 2;
			sprite.y = t*4 + 260;
			sprite.update();
			if (sprite.x < -40) {
				sprite.x = 340;
			}

			t = Math.sin(j += .4 % (Math.PI / 4));
			legr = avatar3.leg.right;
			legl = avatar3.leg.left;
			legr.angle = t;
			legr.update();
			legl.angle = -t;
			legl.update();
			avatar3.arm.right.angle = -t;
			avatar3.arm.right.update();
			avatar3.arm.left.angle = t;
			avatar3.arm.left.update();
			var sprite = avatar3.sprite;
			sprite.x -= 1;
			sprite.y = t*4 + 320;
			sprite.update();
			if (sprite.x < -40) {
				sprite.x = 340;
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

