
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


	function MovieClip(sheet) {
		var self = this;
		var sprite = tofu.createSprite();
		var key;
		var part;
		var paths;
		var current;
		var i;
		var layerData = {};
		var parts = [];
		self.sprite = sprite;
		self.spritesheet = sheet;
		self.motion = null;
		self.frames = {};
		self.currentFrame = {};
		self.totalFrames = {};
		self.parts = {};

		// add part sprites in layer order
		for (key in sheet.sprites) {
			paths = key.split('.');
			current = sheet.data[paths[0]];
			for (i = 1; i < paths.length; i++) {
				current = current.children[paths[i]];
			}
			layerData[key] = current.layer;
			part = sheet.create(key);
			parts.push([key, part]);
			self.parts[key] = part;
		}
		parts.sort(function(a, b) {
			return layerData[a[0]] - layerData[b[0]];
		});
		for (i = 0; i < parts.length; i++) {
			sprite.add(parts[i][1]);
		}

	};

	MovieClip.prototype = {
		loadMotion: function(url, err, callback) {
			var self = this;
			superagent
					.get(url)
					.set('Accept', 'application/json')
          .end(function(res) {
						var key, path, i, l, current;
            if (res.ok) {
              self.motion = res.body;
							// find animation data by the key for each part sprite
							for (key in self.spritesheet.sprites) {
								path = key.split('.');
								current = self.motion;
								for (i = 0, l = path.length; i < l; i++) {
									current = current[path[i]];
									if (!current) {
										break;
									}
								}
								if (current) {
									self.frames[key] = current;
									self.currentFrame[key] = 0;
									self.totalFrames[key] = current.length;
								}
							}
							callback();
            } else {
              err('failed to load motion data');
            }
					});
		},
		nextFrame: function(frame) {
			var self = this;
			var key;
			for (key in self.currentFrame) {
				self.currentFrame[key]++;
				// repeat
				self.currentFrame[key] %= self.totalFrames[key];
			}
		},
		update: function() {	
			var self = this;
			var key;
			var frame;
			var mat;
			var update = false;
			for (key in self.frames) {
				frame = self.frames[key];
				mat = frame[self.currentFrame[key]];
				if (mat) {
					self.parts[key].specifiedMatrix = 
							[mat[0], mat[1], mat[2], mat[3], mat[4]*pixelRatio/2, mat[5]*pixelRatio/2];
					self.parts[key].update();
					update = true;
				}
			};
			if (update) {
				self.sprite.update();					
			}
		}
	};

	var mc = null;

	var sheet = tofu.createSpriteSheet({
		url: './img/avatar'+ratio+'.png'
	}).on('load', function() {
		var self = this;
		mc = new MovieClip(self);
		mc.loadMotion(
			'./mot/test_motion.json', 
			function(message) {console.log('error ', message);}, 
			function() {
				mc.sprite.x = 180;
				mc.sprite.y = 300;
				stage.add(mc.sprite);
				mc.update();
				stage.on('enterframe', function() {
					mc.nextFrame();
					mc.update();
				});
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

