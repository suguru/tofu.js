
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
	var sprite = tofu.createSprite();

	var pixelRatio = window.devicePixelRatio || 1;

	var bitmap = tofu.createBitmap({
		url: './img/test'+Math.floor(pixelRatio*10)+'.png',
		//baseX: 27, baseY: 45
		baseX: 27, baseY: 45
	});
	stage.add(sprite);

	sprite.translate(100,100);
	sprite.update();

	sprite.add(bitmap);

	var bitmap2 = tofu.createBitmap({
		url: './img/test'+Math.floor(pixelRatio*10)+'.png',
		baseX: 27, baseY: 45
	});

	var bitmap3 = tofu.createBitmap({
		url: './img/test'+Math.floor(pixelRatio*10)+'.png',
		baseX: 27, baseY: 45
	});
	//bitmap3.translate(-30,80);

	sprite.add(bitmap2);
	sprite.add(bitmap3);
	
	var sprite2 = tofu.createSprite();
	var bitmap4 = tofu.createBitmap({
		url: './img/test'+Math.floor(pixelRatio*10)+'.png',
		baseX: 27, baseY: 45
	});

	bitmap.translate(20,0);
	bitmap2.translate(50,50);
	bitmap3.translate(-10,80);
	bitmap4.translate(-40,40);

	//sprite2.add(bitmap4);
	sprite2.translate(100,50);
	sprite2.update();
	sprite2.add(bitmap4);
	stage.add(sprite2);

	/*
	var canvas = document.createElement('canvas');
	var image = new Image();
	image.onload = function() {
		canvas.style.width  = Math.ceil(image.width / 2) + 'px';
		canvas.style.height = Math.ceil(image.height/ 2) + 'px';
		canvas.width = image.width;
		canvas.height = image.height;
		var context = canvas.getContext('2d');
		context.drawImage(image,0,0);
	};
	image.src = '/img/test1.png';
	document.body.appendChild(canvas);
	document.body.appendChild(image);
	*/

	var r = .4 / stage.frameRate;
	var fps = 0;

	$('#ratio').text('RATIO ' + (pixelRatio || 1));
	$('#cpu').text('CPU 0%');

	setInterval(function() {
		bitmap.rotate(r);
		bitmap.update();
		bitmap3.rotate(-r);
		bitmap3.update();
		//bitmap2.rotate(r);
		//bitmap2.update();
		fps++;
	}, Math.floor(1000/frameRate));
	setInterval(function() {
		$('#fps').text('FPS '+fps);
		$('#cpu').text('CPU '+stage.cpu + '%');
		fps = 0;
	}, 1000);

});
