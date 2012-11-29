
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

	function CutoffAnimationSheet(sheet) {
		var self = this;
		var positionKey;
		var name;
		self.names = [];
		self.spritesheet = sheet;
		for (positionKey in sheet.sprites) {
			sheet.sprites[positionKey]['base'] = {x:0, y:0};
		}
		for (name in sheet.data) {
			if (name.indexOf('positions') < 0) {
				self.names.push(name);
			}
		}
	}

	CutoffAnimationSheet.prototype = {
		create: function(name) {
			var self = this;
			var indices = self.spritesheet.data[name];
			if (!indices) {
				throw new Error(name + ' does not exist');
			}
			var spriteArray = [];
			var i, l;
			for (i = 0, l = indices.length; i < l; i++) {
				spriteArray.push(
					self.spritesheet.create('positions.' + indices[i]));
			}
			return new CutoffAnimation(spriteArray);
		}
	};

	function CutoffAnimation(spriteArray) {
		var self = this;
		self.sprite = tofu.createSprite();
		self.frames = spriteArray;
		self.currentFrame = 0;
		self.totalFrames = spriteArray.length;
		self.currentSprite = self.frames[self.currentFrame];
		self.sprite.add(self.currentSprite);
		self.sprite.update();
	}

	CutoffAnimation.prototype = {
		nextFrame: function() {
			var self = this;
			self.currentFrame++;
			self.currentFrame %= self.totalFrames;
		},
		update: function() {
			var self = this;
			self.sprite.remove(self.currentSprite);
			self.currentSprite = self.frames[self.currentFrame];
			self.sprite.add(self.currentSprite);
			self.sprite.update();
		}
	};

	var animSpritesheet = null;
	var animSprites = [];

	var sheet = tofu.createSpriteSheet({
		url: './img/motion_watering'+ratio+'.png'
	}).on('load', function() {
		var self = this;
		animSpritesheet = new CutoffAnimationSheet(self);
		var animSprite = animSpritesheet.create('arm_l_item');
		animSprite.sprite.x = 200;
		animSprite.sprite.y = 300;
		stage.add(animSprite.sprite);
		animSprites.push(animSprite);
		var animSprite2 = animSpritesheet.create('arm_l_item');
		animSprite2.sprite.x = 250;
		animSprite2.sprite.y = 320;
		stage.add(animSprite2.sprite);
		animSprites.push(animSprite2);
		stage.on('enterframe', function() {
			var i, l, animSprite;
			for (i = 0, l = animSprites.length; i < l; i++) {
				animSprite = animSprites[i];
				animSprite.nextFrame();
				animSprite.update();	
			}
		});
	});

	$('#ratio').text('RATIO ' + (pixelRatio || 1));
	$('#cpu').text('CPU 0%');
	stage.on('enterframe', function() {
		fps++;
		
	});
	setInterval(function() {
		$('#fps').text('FPS '+fps);
		$('#cpu').text('CPU '+stage.cpu + '%');
		fps = 0;
	}, 1000);

});

