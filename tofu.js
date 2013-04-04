
/**
 * tofu.js is the light-weight sprite library
 * which draws sprite images to html5 canvas.
 *
 * tofu.js includes equation library distributed
 * as BSD License by Robert Penner.
 *
 * Copyright (c) 2013 CyberAgent, Inc.
 *
 * @license MIT
 * @author CyberAgent, Inc.
 */
(function (w) {

	var doc = document;

	var pixelRatio = window.devicePixelRatio || 1;
	var htmlRatio = pixelRatio;

	var supportTouch = 'ontouchstart' in document.documentElement;

	var HTML_MODE = false;
	var CANVAS_MODE = true;

	var STROKE_DRAW_REGION = 0;
	var WATCH_CANVAS = false;
	var WATCH_TRACE = false;
	var WATCH_DETAIL = false;

	// empty gif image
	var emptyImageUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

	// Math short-cuts
	var abs = Math.abs;
	var floor = Math.floor;
	var ceil = Math.ceil;
	var round = Math.round;
	var max = Math.max;
	var min = Math.min;
	var sin = Math.sin;
	var pow = Math.pow;
	var cos = Math.cos;
	var sqrt = Math.sqrt;
	var asin = Math.asin;
	var PI = Math.PI;
	var PI_DOUBLE = PI*2;

	var CANVAS_MAP = {};
	var CANVAS_ID = 0;

	// Shortcut
	var fromCharCode = String.fromCharCode;
	var isArray = Array.isArray;

	var now = null;
	if ('now' in Date) {
		now = Date.now;
	} else {
		now = function now() {
			return +(new Date());
		};
	}

	// insert stylesheet
	(function() {
		var head = document.getElementsByTagName('head')[0];
		var style = createElement('style');
		head.appendChild(style);
		var sheet = style.sheet;
		var count = 0;
		sheet.insertRule('.tofu-stage { position: relative; }', count++);
		sheet.insertRule('.tofu-stage-touch { position: absolute; }', count++);
		sheet.insertRule('.tofu-object { position: absolute; background-size: 100%; -webkit-transform-origin: left top; }', count++);
		sheet.insertRule('.tofu-container { position: relative; }', count++);
	})();

	// create the html element
	function createElement(elementType, attrs) {
		var element =  doc.createElement(elementType);
		if (attrs) {
			for (var name in attrs) {
				element.setAttribute(name, attrs[name]);
			}
		}
		return element;
	}

	// set css
	function css(element, map) {
		for (var name in map) {
			element.style[name] = map[name];
		}
		return element;
	}

	// create the canvas element
	function createContext(width, height) {
		width = width || 0;
		height = height || 0;
		var id = 'c'+(++CANVAS_ID);
		var context = document.getCSSCanvasContext('2d', id, width, height);
		var canvas = context.canvas;
		canvas.id = id;
		if (WATCH_TRACE) {
			var stack = new Error().stack;
			if (stack) {
				stack = new Error().stack.split('\n').splice(2);
				for (var i = 0; i < stack.length; i++) {
					stack[i] = stack[i].replace(/^\s+at\s+/,'');
				}
				canvas._stack_ = stack;
			}
		}
		if (WATCH_CANVAS) {
			CANVAS_MAP[id] = canvas;
		}
		return context;
	}

	// get the 2d context of the canvas
	function getContext(canvas) {
		return canvas.getContext('2d');
	}

	// select element by css selector
	function select(query) {
		return doc.querySelector(query);
	}

	// return ratio converted value
	function ratio(value) {
		if (pixelRatio === 1) {
			return value;
		} else {
			return floor(value * pixelRatio);
		}
	}

	// return ratio value for html elements
	function htmlratio(value) {
		if (htmlRatio === 1) {
			return value;
		} else {
			return floor(value * htmlRatio);
		}
	}

	// add 'px' to the number
	function px(val) {
		// rounding
		return val + 'px';
	}

	// convert arguments to array
	function fixArgs(args, slice) {
		if (slice) {
			return Array.prototype.slice.call(args, slice);
		} else {
			return Array.prototype.slice.call(args);
		}
	}

	// draw image to target context
	function drawImage(context) {
		var args = fixArgs(arguments, 1);
		for (var i = 1; i < args.length; i++) {
			var arg = args[i];
			args[i] = floor(arg * pixelRatio);
		}
		if (args.length === 1) {
			args[1] = 0;
			args[2] = 0;
		}
		context.save();
		context.setTransform(1,0,0,1,0,0);
		context.drawImage.apply(context, args);
		context.restore();
	}

	// draw image to target context without pixel ratio calculation
	function drawImageDirect(context, image, x, y, width, height, dx, dy, dwidth, dheight) {
		var alen = arguments.length;
		if (alen >= 4) {
			x = floor(x);
			y = floor(y);
			if (alen === 4) {
				context.drawImage(image, x, y);
				return;
			}
		}
		if (alen >= 6) {
			width = floor(width);
			height = floor(height);
			if (alen === 6) {
				context.drawImage(image, x, y, width, height);
				return;
			}
		}
		dx = floor(dx);
		dy = floor(dy);
		dwidth = floor(dwidth);
		dheight = floor(dheight);
		context.drawImage(image, x, y, width, height, dx, dy, dwidth, dheight);
	}

	// stop propagation for event listener
	function stopPropagation(e) {
		e.stopPropagation();
	}

	var EventEmitter = (function() {
		function EventEmitter() {
		}
		EventEmitter.prototype = {
			/**
			 * EventEmitter
			 */
			init: function(options) {
				options = options || {};
				var self = this;
				self.listeners = {};
				return self;
			},
			// register event handlers
			on: function(name, handler) {
				var self = this;
				if (self.destroyed) {
					return;
				}
				var listeners = self.listeners;
				var handlers = listeners[name];
				// set handlers
				if (!handlers) {
					handlers = listeners[name] = [];
				}
				// check existence before push
				if (handlers.indexOf(handler) < 0) {
					handlers.push(handler);
				}
				return self;
			},
			// unregister event handlers
			off: function(name, handler) {
				var self = this;
				var handlers = self.listeners[name];
				if (handlers) {
					if (handler) {
						// clear specific handler
						var index = handlers.indexOf(handler);
						while (index >= 0) {
							handlers.splice(index,1);
							index = handlers.indexOf(handler);
						}
					} else {
						// delete all handlers
						delete self.listeners[name];
					}
				}
				return self;
			},
			// register event handler which removed once called
			once: function(name, handler) {
				var self = this;
				function proxy() {
					// remove from event emitter
					self.off(name, proxy);
					// call source handler
					handler.apply(self, arguments);
				}
				self.on(name, proxy);
				return self;
			},
			// check emittable
			emittable: function(name) {
				var handlers = this.listeners[name];
				return handlers && handlers.length > 0;
			},
			// trigger handlers which registered the event
			emit: function(name) {
				var self = this;
				var args = fixArgs(arguments, 1);
				// do not emit destroyed object
				if (self.destroyed) {
					return;
				}
				// get handlers
				var listeners = self.listeners;
				if (listeners) {
					var handlers = listeners[name];
					if (handlers) {
						// call all handlers
						var length = handlers.length;
						var handler, i;
						if (length > 0) {
							for (i = 0; i < length; i++) {
								handler = handlers[i];
								if (handler) {
									handler.apply(self, args);
								}
							}
						}
					}
				}
				return self;
			},
			// clean all resources
			destroy: function() {
				var self = this;
				self.listeners = {};
				self.destroyed = true;
				return self;
			}
		};
		return EventEmitter;
	})();

	var LinkedList = (function() {
		function LinkedList() {
			var self = this;
			self.head = null;
			self.tail = null;
		}
		LinkedList.prototype = {
			// add object to the tail
			push: function(o) {
				var self = this;
				var node;
				if (self.tail) {
					var prev = self.tail;
					node = [prev,o,null];
					prev[2] = node;
					o._node = node;
					self.tail = node;
				} else {
					node = [null,o,null];
					self.head = node;
					self.tail = node;
					o._node = node;
				}
			},
			pop: function() {
			},
			// insert object to the head
			unshift: function(o) {
				var self = this;
				var node;
				if (self.head) {
					var next = self.head;
					node = [null,o,next];
					next[0] = o;
					o._node = node;
					self.head = node;
				} else {
					node = [null,o,null];
					self.head = node;
					self.tail = node;
					o._node = node;
				}
			},
			shift: function() {
			},
			// remove object
			remove: function(o) {
				var self = this;
				var node = o._node;
				if (node && node[1]) {
					var prev = node[0];
					var curr = node[1];
					var next = node[2];
					if (curr === self.head) {
						// if head is removed, choose next as head
						self.head = curr[2];
					}
					if (curr === self.tail) {
						// if tail is removed, choose previous as tail
						self.tail = curr[0];
					}
					if (prev) {
						// connect previous and next
						prev[2] = next;
					} else {
						// set as head if previous does not exist
						self.head = next;
					}
					if (next) {
						// connect previous and next
						next[0] = prev;
					} else {
						// set as foot if next does not exist
						self.tail = prev;
					}
					delete o._node;
				}
			},
			// execute handler to each elements in this list
			each: function(handler) {
				var self = this;
				var node = self.head;
				var curr = null;
				while (node) {
					curr = node[1];
					node = node[2];
					// call handler
					if (curr) {
						handler.call(curr, curr);
					}
				}
			},
			// clean up all nodes
			destroy: function() {
				var self = this;
				var node = self.head;
				var next;
				while (node) {
					next = node[2];
					node[0] = null;
					node[1] = null;
					node[2] = null;
					node = next;
				}
				self.head = null;
				self.tail = null;
			}
		};
		return LinkedList;
	})();

	/**
	 * matrix utilities to calculate matrix as array for performance
	 */
	var Matrix = {
		// create a matrix from propertied object
		create: function(object) {
			return [
				object.a, object.b,
				object.c, object.d,
				object.tx, object.ty
			];
		},
		clone: function(array) {
			return [
				array[0],array[1],
				array[2],array[3],
				array[4],array[5]
			];
		},
		copy: function(m1, m2) {
			for (var i = 0; i < 6; i++) {
				m2[i] = m1[i];
			}
		},
		equal: function(m1, m2) {
			for (var i = 0; i < 6; i++) {
				if (m1[i] !== m2[i]) {
					return false;
				}
			}
			return true;
		},
		// matrix array
		// [a,b,c,d,tx,ty] = [0,1,2,3,4,5]
		rotate: function(array, angle) {
			var ac = cos(angle);
			var as = sin(angle);
			var a = array[0];
			var b = array[1];
			var c = array[2];
			var d = array[3];
			var tx = array[4];
			var ty = array[5];
			array[0] = a * ac - b * as;
			array[1] = b * ac + a * as;
			array[2] = c * ac - d * as;
			array[3] = d * ac + c * as;
			array[4] = tx * ac - ty * as;
			array[5] = ty * ac + tx * as;
			return Matrix;
		},
		// translate matrix
		translate: function(array, tx, ty) {
			array[4] += tx;
			array[5] += ty;
			return Matrix;
		},
		// scale matrix
		scale: function(array, sx, sy) {
			if (sy === undefined) {
				sy = sx;
			}
			array[0] *= sx;
			array[1] *= sy;
			array[2] *= sx;
			array[3] *= sy;
			array[4] *= sx;
			array[5] *= sy;
			return Matrix;
		},
		// reset matrix
		reset: function(array) {
			array[0] = array[3] = 1;
			array[1] = array[2] = array[4] = array[5] = 0;
			return Matrix;
		},
		// invert matrix
		invert: function(array) {
			var a = array[0];
			var b = array[1];
			var c = array[2];
			var d = array[3];
			var tx = array[4];
			var ty = array[5];
			var det = a * d - b * c;
			return [
				d / det,
				-b / det,
				-c / det,
				a / det,
				(c * ty - d * tx) / det,
				-(a * ty - b * tx) / det
			];
		},
		// concat matrix
		concat: function(array, target, another) {
			var a1 = target[0];
			var b1 = target[1];
			var c1 = target[2];
			var d1 = target[3];
			var tx1 = target[4];
			var ty1 = target[5];
			var a2 = another[0];
			var b2 = another[1];
			var c2 = another[2];
			var d2 = another[3];
			var tx2 = another[4];
			var ty2 = another[5];
			array[0] = a1 * a2 + b1 * c2;
			array[1] = a1 * b2 + b1 * d2;
			array[2] = c1 * a2 + d1 * c2;
			array[3] = c1 * b2 + d1 * d2;
			array[4] = tx1 * a2 + ty1 * c2 + tx2;
			array[5] = tx1 * b2 + ty1 * d2 + ty2;
		},
		// calculate actual region from matrix and rectangle
		region: function(matrix, rect) {

			var a = matrix[0];
			var b = matrix[1];
			var c = matrix[2];
			var d = matrix[3];
			var tx = matrix[4];
			var ty = matrix[5];

			// short cut
			if (a === 1 && b === 0 && c === 0 && d === 1) {
				if (tx === 0 && ty === 0) {
					// return default rectangle
					return rect;
				} else {
					// return with simple calculation
					return [floor(tx+rect[0]), floor(ty+rect[1]), ceil(rect[2]), ceil(rect[3])];
				}
			}

			var rx1 = rect[0];
			var ry1 = rect[1];
			var rx2 = rx1 + rect[2];
			var ry2 = ry1 + rect[3];

			var x1a = rx1 * a;
			var y1c = ry1 * c;
			var x1b = rx1 * b;
			var y1d = ry1 * d;

			var x2a = rx2 * a;
			var y2c = ry2 * c;
			var x2b = rx2 * b;
			var y2d = ry2 * d;

			// rx1, ry1
			var x1 = x1a + y1c + tx;
			var y1 = x1b + y1d + ty;
			// rx1, ry2
			var x2 = x1a + y2c + tx;
			var y2 = x1b + y2d + ty;
			// rx2, ry1
			var x3 = x2a + y1c + tx;
			var y3 = x2b + y1d + ty;
			// rx2, ry2
			var x4 = x2a + y2c + tx;
			var y4 = x2b + y2d + ty;

			var left = x1 < x2 ? x1 : x2;
			left = x3 < left ? x3 : left;
			left = x4 < left ? x4 : left;
			var top = y1 < y2 ? y1 : y2;
			top = y3 < top ? y3 : top;
			top = y4 < top ? y4 : top;
			var right = x1 > x2 ? x1 : x2;
			right = x3 > right ? x3 : right;
			right = x4 > right ? x4 : right;
			var bottom = y1 > y2  ? y1 : y2;
			bottom = y3 > bottom ? y3 : bottom;
			bottom = y4 > bottom ? y4 : bottom;
			return [
				floor(left),
				floor(top),
				ceil(right-left),
				ceil(bottom-top)
			];
		}
	};

	/**
	 * Rectangle utilities to calculate rectangle as array.
	 */
	var Rectangle = {
		create: function(object) {
			return [object.x, object.y, object.width, object.height];
		},
		copy: function(r1, r2) {
			r2[0] = r1[0];
			r2[1] = r1[1];
			r2[2] = r1[2];
			r2[3] = r1[3];
		},
		// check point is contained the region
		contain: function(rect, position) {
			if (!rect || !position) {
				return false;
			}
			var x = position.x;
			var y = position.y;
			return rect[0] <= x &&
				rect[1] <= y &&
				x <= rect[0]+rect[2] &&
				y <= rect[1]+rect[3]
			;
		},
		// return intersected
		intersect: function(rect1, rect2, returnWhole) {
			var r1l = rect1[0];
			var r1t = rect1[1];
			var r1r = r1l + rect1[2];
			var r1b = r1t + rect1[3];
			var r2l = rect2[0];
			var r2t = rect2[1];
			var r2r = r2l + rect2[2];
			var r2b = r2t + rect2[3];
			if (
				r2l >= r1r ||
				r2r <= r1l ||
				r2t >= r1b ||
				r2b <= r1t
			) {
				// not intersected
				return null;
			} else {
				var r,l,t,b;
				if (returnWhole) {
					// return whole area if specified
					l = r1l < r2l ? r1l : r2l;
					t = r1t < r2t ? r1t : r2t;
					r = r1r > r2r ? r1r : r2r;
					b = r1b > r2b ? r1b : r2b;
				} else {
					// return intersected area (default)
					l = r1l > r2l ? r1l : r2l;
					t = r1t > r2t ? r1t : r2t;
					r = r1r < r2r ? r1r : r2r;
					b = r1b < r2b ? r1b : r2b;
				}
				return [l,t,r-l,b-t];
			}
		},
		// merge rectangle regions
		merge: function(rects, max) {

			// return if rectangle doest not exist or only 1 rectangle
			var length = rects.length;
			if (length < 2) {
				return rects;
			}

			var merged, i, j;
			do {
				merged = false;
				for (i = 0; i < length-1; i++) {
					var rect1 = rects[i];
					if (rect1 === null) {
						continue;
					}
					for (j = i+1; j < length; j++) {
						var rect2 = rects[j];
						if (rect2 === null) {
							continue;
						}
						var intersect = Rectangle.intersect(rect1,rect2,1);
						if (intersect) {
							// update rect 1
							rect1 = rects[i] = intersect;
							rects[j] = null;
							// mark merged flag
							merged = true;
						}
					}
				}
			} while (merged);

			var newlist = [];
			for (i = 0; i < length; i++) {
				var rect = rects[i];
				if (rect) {
					if (rect[0] < max[0]) {
						rect[0] = max[0];
					}
					if (rect[1] < max[1]) {
						rect[1] = max[1];
					}
					if (rect[0] + rect[2] > max[0] + max[2]) {
						rect[2] = max[2] - max[0] - rect[0];
					}
					if (rect[1] + rect[3] > max[1] + max[3]) {
						rect[3] = max[3] - max[1] - rect[1];
					}
					newlist.push(rect);
				}
			}
			return newlist;
		}
	};

	/**
	 * stage provide root container
	 * which cannot render anything but can put DisplayObject
	 */
	var Stage = extend(EventEmitter, function Stage() {}, function() {

		function getxy(e) {

			var touches = e.changedTouches;
			if (touches) {
				// touch event
				var touch = touches[0];
				var target = touch.target;
				var body = document.body;
				var position = target.getBoundingClientRect();
				var offsetLeft = position.left;
				var offsetTop = position.top;
				var scrollLeft = body.scrollLeft;
				var scrollTop = body.scrollTop;

				return {
					x: floor((touch.pageX - offsetLeft + scrollLeft) * htmlRatio),
					y: floor((touch.pageY - offsetTop + scrollTop) * htmlRatio),
					page: {
						x: touch.pageX,
						y: touch.pageY
					}
				};
			} else {
				// mouse event
				return {
					x: floor(e.offsetX * htmlRatio),
					y: floor(e.offsetY * htmlRatio),
					page: {
						x: e.pageX,
						y: e.pageY
					}
				};
			}
		}

		function setxy(curr, pos, e) {
			if (curr && curr.region) {
				e.currentX = pos.x - curr.region[0];
				e.currentY = pos.y - curr.region[1];
			} else {
				delete e.currentX;
				delete e.currentY;
			}
		}

		function stopPropagation() {
			this._stopped = true;
		}

		var TIMEOUT_ID = 0;

		return {
			init: function(options) {
				options = options || {};
				var self = this;
				var width = self.width = options.width || 100;
				var height = self.height = options.height || 100;

				var html, canvas;

				if (HTML_MODE) {
					html = createElement('div', {'class':'tofu tofu tofu-stage'});

					css(html, {
						width: px(width),
						height: px(height),
						overflow: 'hidden'
					});

					var body = createElement('div', {'class':'tofu tofu-stage-body'});
					var touch = createElement('div', {'class':'tofu tofu-stage-touch'});
					css(touch, { width: px(width), height: px(height) });
					html.appendChild(body);
					html.appendChild(touch);
					html.body = body;
					html.touch = touch;
					self.html = html;
				} else {
					canvas = createElement('canvas', {
						width: ceil(width * pixelRatio),
						height: ceil(height * pixelRatio)
					});
					// set canvas region
					canvas.style.width = px(width);
					canvas.style.height = px(height);

					var context = getContext(canvas);

					self.canvas = canvas;
					self.context = context;
				}

				self.frameRate = options.frameRate || 20;
				self.frameWait = round(1000 / self.frameRate);
				self.frameTotal = 0;

				var touchPosition = {
					x: 0,
					y: 0,
					enable: false,
					start: { x: 0, y: 0 }, // started touch position
					page: { x: 0, y: 0 }, // page position where touched
					prev: { x: 0, y: 0 }, // previous position stored
					delta: { x: 0, y: 0, count: 0 }, // difference
					intervalId: -1
				};
				self.list = createLinkedList();

				self.redraws = [];

				self.removes = {};
				self.updates = {};

				self.region = [0, 0, width * htmlRatio, height * htmlRatio];
				self.regionmax = self.region.concat();
				self.player = options.player || createMotionPlayer();
				self.touching = null;
				self.tween = options.tween || createTweenPlayer();
				self.timeouts = {};

				function touchinterval() {
					var prev  = touchPosition.prev;
					var delta = touchPosition.delta;
					// delta
					delta.x = touchPosition.x - prev.x;
					delta.y = touchPosition.y - prev.y;
					// previous
					prev.x = touchPosition.x;
					prev.y = touchPosition.y;
					delta.count++;
				}

				function touchstart(e) {
					e.preventDefault();
					// modify stop propagation
					e.stopPropagation = stopPropagation;
					var pos = getxy(e);

					// enable touching
					var delta = touchPosition.delta;

					touchPosition.x = pos.x;
					touchPosition.y = pos.y;
					touchPosition.start.x = pos.x;
					touchPosition.start.y = pos.y;
					touchPosition.prev.x = pos.x;
					touchPosition.prev.y = pos.y;
					touchPosition.page = pos.page;

					// reset delta
					delta.x = 0;
					delta.y = 0;
					delta.count = 0;

					e.pageX = pos.page.x;
					e.pageY = pos.page.y;
					e.stageX = round(pos.x / pixelRatio);
					e.stageY = round(pos.y / pixelRatio);

					// mark touching
					touchPosition.enable = true;

					// start interval to calculate delta
					touchPosition.intervalId = setInterval(touchinterval, 50);

					var list = self.find(touchPosition);
					var touching = self.touching;
					var i, curr;
					if (touching) {
						// trigger touch end if previous object left
						for (i = 0; i < touching.length; i++) {
							curr = touching[i];
							setxy(curr, pos, e);
							curr.emit('touchend', e);
							// break if propagation stopped
							if (e._stopped) {
								// reset flag for the next event
								break;
							}
						}
					}
					// update current list
					self.touching = list;
					// reset flag
					e._stopped = false;
					if (list && list.length > 0) {
						for (i = 0; i < list.length; i++) {
							curr = list[i];
							setxy(curr, pos, e);
							curr.emit('touchstart', e);
							// break if propagation stopped
							if (e._stopped) {
								break;
							}
						}
					}
					if (!e._stopped) {
						// trigger stage event
						setxy(null, pos, e);
						self.emit('touchstart', e);
					}
					// delete custom funciton
					delete e.stopPropagation;
				}

				function touchmove(e){
					e.preventDefault();
					e.stopPropagation = stopPropagation;
					if (touchPosition.enable) {
						var pos = getxy(e);
						e.stageX = round(pos.x / pixelRatio);
						e.stageY = round(pos.y / pixelRatio);
						e.moveX = (pos.x - touchPosition.x) / htmlRatio;
						e.moveY = (pos.y - touchPosition.y) / htmlRatio;
						e.pageX = pos.page.x;
						e.pageY = pos.page.y;
						touchPosition.x = pos.x;
						touchPosition.y = pos.y;
						var touching = self.touching;
						if (touching && touching.length > 0) {
							for (var i = 0; i < touching.length; i++) {
								var curr = touching[i];
								setxy(curr, pos, e);
								curr.emit('touchmove', e);
								if (e._stopped) {
									break;
								}
							}
						}
						if (!e._stopped) {
							// trigger stage event
							setxy(null, pos, e);
							self.emit('touchmove', e);
						}
					}
					delete e.stopPropagation;
				}

				function touchend(e) {
					e.preventDefault();
					e.stopPropagation = stopPropagation;

					var pos = getxy(e);
					var delta = touchPosition.delta;
					if (delta.count === 0) {
						delta.x = (pos.x - touchPosition.start.x) / htmlRatio;
						delta.y = (pos.y - touchPosition.start.y) / htmlRatio;
					}

					// apply delta
					e.deltaX = delta.x;
					e.deltaY = delta.y;
					e.pageX = pos.page.x;
					e.pageY = pos.page.y;
					e.stageX = round(pos.x / pixelRatio);
					e.stageY = round(pos.y / pixelRatio);

					touchPosition.x = pos.x;
					touchPosition.y = pos.y;
					touchPosition.enable = false;

					// clear delta update
					clearInterval(touchPosition.intervalId);

					// get current object which
					var list = self.find(touchPosition);
					var ids = {};
					var length = list.length;
					for (var i = 0; i < length; i++) {
						ids[list[i].id] = 1;
					}
					var touching = self.touching;
					length = touching ? touching.length : 0;

					// check moved while touching
					var moved =
						(abs(touchPosition.page.x - pos.page.x) > 5 || abs(touchPosition.page.y - pos.page.y) > 5);

					// tap
					var tapCancel = false;
					var touchEndCancel = false;
					if (touching && length > 0) {
						var curr;
						for (i = 0; i < touching.length; i++) {
							curr = touching[i];
							setxy(curr, pos, e);
							// invoke touch end
							if (!touchEndCancel) {
								e._stopped = false;
								curr.emit('touchend', e);
								if (e._stopped) {
									touchEndCancel = true;
								}
							}
							// check touch position contains started object
							if (!moved && ids[curr.id]) {
								if (!tapCancel) {
									e._stopped = false;
									curr.emit('tap', e);
									if (e._stopped) {
										tapCancel = true;
									}
								}
							} else {
								// invoke cacnel if not tapped
								curr.emit('touchcancel', e);
							}
						}
					}
					// touch end stage
					if (!touchEndCancel) {
						setxy(null, pos, e);
						self.emit('touchend', e);
					}
					// tap stage
					if (!tapCancel) {
						setxy(null, pos, e);
						self.emit('tap', e);
					}
					self.touching = null;
					delete e.stopPropagation;
				}


				// touch start event
				var container = (CANVAS_MODE) ? canvas : html.touch;
				if (supportTouch) {
					container.addEventListener('touchstart', touchstart);
					container.addEventListener('touchmove', touchmove);
					container.addEventListener('touchend', touchend);
				} else {
					container.addEventListener('mousedown', touchstart);
					container.addEventListener('mousemove', touchmove);
					container.addEventListener('mouseup', touchend);
				}

				setTimeout(function() {
					self.frame(now() + self.frameWait);
				}, 0);
			},
			show: function(selector) {
				var self = this;
				var element = select(selector);
				if (element) {
					element.appendChild(self.container());
				}
			},
			find: function(position) {
				var self = this;
				function _find(object, array) {
					array = array || [];
					var list = object.list;
					var node = list.tail;
					var curr, region;
					while (node) {
						curr = node[1];
						if (!curr.hidden) {
							if (curr.list) {
								// recursive search
								_find(curr, array);
							}
							// current check
							region = curr.region;
							if (Rectangle.contain(region, position)) {
								array.push(curr);
							}
						}
						// next node
						node = node[0];
					}
					return array;
				}
				return _find(self);
			},
			// add object to the stage
			add: function() {
				var self = this;
				var args = fixArgs(arguments);
				function visit() {
					this.emit('added');
				}
				for (var i = 0; i < args.length; i++) {
					var object = args[i];
					if (object._stage || object.parent) {
						object.remove();
					}
					self.list.push(object);
					if (HTML_MODE) {
						self.html.body.appendChild(object.html);
					}
					object._stage = self;
					object.visit(visit);
				}
			},
			// remove object from the stage
			remove: function() {
				var args = fixArgs(arguments);
				for (var i = 0; i < args.length; i++) {
					var object = args[i];
					object.remove();
					object._stage = null;
				}
			},
			// get monitor
			monitor: function(option) {
				option = option || {};
				var self = this;
				if (self._monitor) {
					return self._monitor;
				}

				WATCH_CANVAS = true;
				WATCH_TRACE  = true;
				WATCH_DETAIL = option.detail === true;

				var prefix = 'tofu-monitor';

				var monitor = self._monitor = createElement('div');
				monitor.id = prefix;

				var fps = createElement('div');
				fps.id = prefix+'-fps';
				monitor.appendChild(fps);

				var cpu = createElement('div');
				cpu.id = prefix+'-cpu';
				monitor.appendChild(cpu);

				var count = createElement('div');
				count.id = prefix+'-count';
				monitor.appendChild(count);

				var ccount = createElement('div');
				ccount.id = prefix+'-canvas';
				monitor.appendChild(ccount);

				var timeout = createElement('div');
				timeout.id = prefix+'-timeout';
				monitor.appendChild(timeout);

				var render = createElement('div');
				render.id = prefix+'-render';

				var draw = createElement('div');
				draw.id = prefix+'-draw';
				if (WATCH_DETAIL) {
					monitor.appendChild(render);
					monitor.appendChild(draw);
				}

				monitor.fps = 0;
				monitor.elapsed = 0;
				monitor.timeout = 0;

				monitor.render = 0;
				monitor.draw = 0;

				function update() {
					var fpsValue = monitor.fps;
					var cpuValue = min(100, floor((monitor.elapsed / 1000) * 100));
					var objectCount = self.count();
					var canvasCount = 0;
					for (var id in CANVAS_MAP) {
						if (id) {
							canvasCount++;
						}
					}
					monitor.querySelector('#'+fps.id).innerHTML = 'FPS '+fpsValue;
					monitor.querySelector('#'+cpu.id).innerHTML = 'CPU '+cpuValue+'%';
					monitor.querySelector('#'+count.id).innerHTML = 'OBJECT '+objectCount;
					if (WATCH_CANVAS) {
						monitor.querySelector('#'+ccount.id).innerHTML = 'CANVAS '+canvasCount;
					}
					monitor.querySelector('#'+timeout.id).innerHTML = 'TIMER &nbsp;'+monitor.timeout;
					if (WATCH_DETAIL) {
						monitor.querySelector('#'+draw.id).innerHTML = 'DRAW &nbsp;&nbsp;'+monitor.draw;
						monitor.querySelector('#'+render.id).innerHTML = 'RENDER '+monitor.render;
					}
					// reset fps/cpu
					monitor.fps = 0;
					monitor.elapsed = 0;
					monitor.render = 0;
					monitor.draw = 0;
				}
				setInterval(update, 1000);
				update();
				return monitor;
			},
			// frame handler
			frame: function(next) {

				var self = this;
				var start = now();
				var context = self.context;
				// proceed tween player
				var tween = self.tween;
				tween.proceed();
				// proceed player frame
				var player = self.player;
				player.proceed();
				// increment frame counter
				self.frameTotal++;

				// skip rendering if wait time is negative
				if (start < next) {
					// check updates and calculate region
					var list = self.list;
					var regionmax = self.regionmax;
					var redraws = self.redraws;
					var i = 0, curr;
					// collect updated regions
					var node = list.head;
					while (node) {
						curr = node[1];
						// collect redraw region and
						// redraw internal canvas if needed
						curr._redraw(redraws, regionmax);
						node = node[2];
					}

					if (CANVAS_MODE) {
						// merge regions
						redraws = Rectangle.merge(redraws, self.region);
						// clearing updated region
						var length = redraws.length;

						for (i = 0; i < length; i++) {
							var redraw = redraws[i];
							if (redraw !== null) {
								clearRect.apply(context, redraw);
							}
						}
						// redraw from head (deepest first)
						node = list.head;
						if (length > 0) {
							while (node) {
								curr = node[1];
								curr._render(
									context,
									redraws,
									null,
									regionmax
								);
								node = node[2];
							}
						}
					}
					self.redraws = [];
					if (self._monitor) {
						self._monitor.fps++;
					}
				}

				// process timeouts
				var timeouts = self.timeouts;
				if (self._monitor) {
					self._monitor.timeout = 0;
				}
				for (var id in timeouts) {
					if (self._monitor) {
						self._monitor.timeout++;
					}
					var timer = timeouts[id];
					if (timer.paused) {
						continue;
					}
					if (timer.canceled) {
						delete timeouts[id];
						continue;
					}
					if (--timer.left <= 0) {
						var target = timer.target;
						// do not invoke if targe is destroyed
						if (target && target.destroyed) {
							delete timeouts[id];
							continue;
						}
						try {
							timer.callback.call(target || timer);
						} catch (e) {
							if (self.emittable('error')) {
								self.emit('error', e);
							} else {
								if (e.stack) {
									console.error(e.stack);
								} else {
									console.error(e);
								}
							}
						}
						if (timer.repeat === -1 || --timer.repeat > 0) {
							timer.left = timer.frames;
						} else {
							delete timeouts[id];
						}
					}
				}

				var end = now();
				var elapsed = end - start;
				var wait = next - end;
				next = next + self.frameWait;
				// reset wait if stage has too much queue
				// which causes long freeze of queued function
				if (wait < -10000) {
					next = end + self.frameWait;
				}

				if (self._monitor) {
					// update monitored value
					self._monitor.elapsed += elapsed;
				}

				self.timerId = setTimeout(function() {
					// assign next frame handler
					try {
						self.emit('enterframe');
					} catch (e) {
						console.error(e.stack);
					}
					try {
						self.frame(next);
					} catch (e) {
						console.error(e.stack);
					}
					try {
						self.emit('exitframe');
					} catch (e) {
						console.error(e.stack);
					}

				}, wait > 0 ? wait : 0);
			},
			// get structure of objects
			structure: function() {
				function visit(list, tree) {
					tree = tree || {};
					var node = list.head;
					while (node) {
						var curr = node[1];
						var obj = { _self_: curr };
						var id = curr.id;
						if (curr.name) {
							id = curr.name + '.' + id;
						}
						tree[id] = obj;
						if (curr.list && curr.list.head) {
							visit(curr.list, obj);
						}
						node = node[2];
					}
					return tree;
				}
				return visit(this.list);
			},
			// get canvas map
			canvasmap: function() {
				return CANVAS_MAP;
			},
			// count objects which are placed on the stage
			count: function() {
				var self = this;
				var count = 0;
				function visit(list) {
					if (list) {
						var node = list.head;
						var curr;
						while (node) {
							count++;
							curr = node[1];
							if (curr && curr.list) {
								visit(curr.list);
							}
							node = node[2];
						}
					}
				}
				visit(self.list);
				return count;
			},
			// mask this stage with rectangle
			mask: function(x, y, width, height) {
				var self = this;
				self.regionmax = [
					x * htmlRatio,
					y * htmlRatio,
					width * htmlRatio,
					height * htmlRatio
				];
				if (HTML_MODE) {
					css(self.html, {
					});
				}
			},
			// get container element
			container: function() {
				var self = this;
				if (CANVAS_MODE) {
					return self.canvas;
				} else {
					return self.html;
				}
			},
			/**
			 * set callback which called after spent specific frame
			 * target is used to detect whether destroyed or not
			 * @param {Function} callback callback function.
			 * @param {Number} frames frame count to wait to call.
			 * @param {Number} repeat repeat count of this timer. -1 to infinite. defauls is 1 (optional)
			 * @param {Object} target target which is watched to be destroyed. (optional)
			 */
			after: function(callback, frames, repeat, target) {
				// repeat is omittable
				if (arguments.length === 3) {
					target = repeat;
					repeat = 1;
				}
				var timer = {
					left: frames,
					frames: frames,
					repeat: repeat === undefined ? 1 : repeat,
					paused: false,
					canceled: false,
					target: target,
					callback: callback,
					pause: function() {
						this.paused = true;
					},
					cancel: function() {
						this.canceled = true;
					}
				};
				this.timeouts[++TIMEOUT_ID] = timer;
				return timer;
			},

			/**
			 * Shortcut for Stage.after() which specifiy
			 * frames as seconds.
			 */
			aftersec: function(callback, sec, repeat, target) {
				var frames = round(sec * self.frameRate);
				this.after(callback, frames, repeat, target);
			}
		};
	});

	/**
	 * base object
	 */
	var DisplayObject = extend(EventEmitter, function DisplayObject() {}, function() {
		var globalId = 0;
		var proto = {
			init: function(options) {
				options = options || {};
				var self = this;
				var id = self.id = ++globalId;
				self.props = {
					x: 'x' in options ? Number(options.x) : 0,
					y: 'y' in options ? Number(options.y) : 0,
					scaleX: 'scaleX' in options ? Number(options.scaleX) : 1,
					scaleY: 'scaleY' in options ? Number(options.scaleY) : 1,
					baseX: 'baseX' in options ? Number(options.baseX) : 0,
					baseY: 'baseY' in options ? Number(options.baseY) : 0,
					angle: 'angle' in options ? Number(options.angle) : 0,
					alpha: 'alpha' in options ? Number(options.alpha) : 1
				};
				var width  = self.width = 'width' in options ? Number(options.width) : 0;
				var height = self.height = 'height' in options ? Number(options.height) : 0;
				self.matrix = [1,0,0,1,0,0]; // transformation matrix
				self.region = [0,0,0,0]; // maximum region of the object
				self.regionmax = null;
				self.regionmask = null;
				self.simple = options.simple === true; // simple object refers set both source and cavas as same. it means no rotation and scale are used
				self.parent = null;
				self.list = null;
				self.previous = {
					region: null,
					matrix: null
				};
				self.flags = {
					child: false,
					update: true,
					updated: false,
					draw: true
				};
				if (HTML_MODE) {
					var html = self.html = createElement('div',{id:'tofu'+id, 'class':'tofu tofu-object'});
					if (width && height) {
						css(html, {
							width: px(width),
							height: px(height)
						});
					}
					self.html = html;
				}
			},
			// destroy resources
			destroy: function() {
				var self = this;
				var list = self.list;
				// call destroy event
				self.emit('destroy');
				// destroy emitter
				EventEmitter.prototype.destroy.apply(self);
				// destroy children
				if (list) {
					var node = list.head;
					var curr;
					while (node) {
						curr = node[1];
						curr.destroy();
						node = node[2];
					}
					// destroy linked list
					list.destroy();
				}
				self.remove();
			},
			// update matrix and redraw canvas if needed
			update: function(draw) {
				var self = this;
				var flags = self.flags;
				// set flag
				flags.update = true;
				if (draw) {
					flags.draw = true;
				}
				// update parent's flag
				var parent = self.parent;
				while (parent) {
					if (!parent.flags.child) {
						parent.flags.child = true;
						parent = parent.parent;
					} else {
						break;
					}
				}
			},
			// collect regions
			_region: function(regions) {
				var self = this;
				var region = self.region;
				regions = regions || [];
				regions.push(region);
				var list = self.list;
				if (list) {
					var node = list.head;
					var curr;
					while (node) {
						curr = node[1];
						if (curr) {
							curr._region(regions);
						}
						node = node[2];
					}
				}
				return regions;
			},
			// collect redraw regions
			_redraw: function(redraws, regionmax) {
				var self = this;
				var flags = self.flags;
				var list = self.list;
				var intersect = Rectangle.intersect;

				if (self.regionmax) {
					// calculate maximum region for the instance
					if (regionmax) {
						regionmax = intersect(regionmax, self.regionmax);
					} else {
						regionmax = self.regionmax;
					}
				}

				var node, curr;

				if (flags.update) {

					self.calculate();
					flags.update = false;

					if (CANVAS_MODE) {
						flags.updated= true;
						var prev = self.previous;
						var region1 = prev.region;
						var region2 = self.region;

						if (regionmax && region2) {
							// re-calculate current region
							region2 = intersect(region2, regionmax);
						}

						if (region1) {
							var inter;
							if (region2) {
								inter = intersect(region1, region2, 1);
								if (inter) {
									// add merged region
									if (inter[2] > 0 && inter[3] > 0) {
										redraws.push(inter);
									}
								} else {
									// add separated region
									if (region1[2] > 0 && region1[3] > 0) {
										redraws.push(region1);
									}
									if (region2 && region2[2] > 0 && region2[3] > 0) {
										redraws.push(region2);
									}
								}
							} else {
								// simply add current region intersected maximum region
								inter = (regionmax) ? intersect(region1, regionmax) : region1;
								if (inter) {
									redraws.push(inter);
								}
							}
						} else if (region2 && region2[2] > 0 && region2[3] > 0) {
							// add curent region only (first time)
							redraws.push(region2);
						}
					}
					// redraw children
					if (list) {
						node = list.head;
						while (node) {
							curr = node[1];
							curr.flags.update = true;
							curr._redraw(redraws, regionmax);
							node = node[2];
						}
					}
				} else if (flags.child && list) {
					node = list.head;
					while (node) {
						curr = node[1];
						var cflags = curr.flags;
						// check before call
						if (cflags.update || cflags.child) {
							// push all elements
							curr._redraw(redraws, regionmax);
						}
						// to next
						node = node[2];
					}
				}
			},
			// draw object
			draw: function() {
			},
			// internal method for rendering
			_render: function(context, regions, hide, regionmax) {
				var self = this;
				var hidden = hide || self.hidden || false;
				var flags = self.flags;
				var region = self.region;
				var stage;

				// switch regionmax to own
				if (self.regionmax) {
					regionmax = self.regionmax;
				}
				var alpha = 1;
				if (CANVAS_MODE && self.alpha < 1) {
					alpha = context.globalAlpha;
					context.globalAlpha -= (1 - self.alpha);
				}

				// update source canvas
				var prev = self.previous;
				var m1 = self.matrix;
				var m2 = prev.matrix;
				// if rotated, scaled or specified
				// redraw internal canvas
				if (flags.draw  ||
						m1 === null ||
						m1[0] !== m2[0] ||
						m1[1] !== m2[1] ||
						m1[2] !== m2[2] ||
						m1[3] !== m2[3]) {

					self.draw();
					flags.draw = false;

					if (WATCH_DETAIL) {
						stage = self.stage();
						if (stage) {
							stage._monitor.draw++;
						}
					}
				}
				prev.region = region;
				prev.matrix = m1;

				if (flags.updated) {
					flags.updated = false;
					if (hidden) {
						prev.region = null;
					} else {
						// render whole area if marked as update
						if (regionmax) {
							var inter = Rectangle.intersect(region, regionmax);
							if (inter) {
								self.render(context, [inter]);
								// update previous region as intersected
								prev.region = inter;
								if (STROKE_DRAW_REGION) {
									context.save();
									context.strokeStyle = 'rgb(180,0,0)';
									context.lineWidth = 1;
									context.strokeRect.apply(context, inter);
									context.restore();
								}
							} else {
								// clear previous region because there are no region to render
								prev.region = null;
							}
						} else {
							// draw whole area
							self.render(context);
							if (STROKE_DRAW_REGION) {
								context.save();
								context.strokeStyle = 'rgb(180,0,0)';
								context.lineWidth = 1;
								context.strokeRect.apply(context, region);
								context.restore();
							}
						}

						if (WATCH_DETAIL) {
							stage = self.stage();
							if (stage) {
								stage._monitor.render++;
							}
						}

					}
				} else {
					// ignore hidden instance
					if (hidden) {
						return;
					}
					// render area which are intersected with regions
					if (region && regionmax) {
						region = Rectangle.intersect(region, regionmax);
					}
					if (region) {
						var i;
						var intersects = [];
						var length = regions.length;
						// get all intersected region
						for (i = 0; i < length; i++) {
							var other = regions[i];
							if (other) {
								var intersect = Rectangle.intersect(region, other);
								if (intersect) {
									intersects.push(intersect);
								}
							}
						}
						length = intersects.length;
						if (length > 0) {
							// draw intersected area
							self.render(context, intersects);
							if (STROKE_DRAW_REGION) {
								context.save();
								context.strokeStyle = 'rgb(0,180,0)';
								context.lineWidth = 1;
								for (i = 0; i < length; i++) {
									context.strokeRect.apply(context, intersects[i]);
								}
								context.restore();
							}
							if (WATCH_DETAIL) {
								stage = self.stage();
								if (stage) {
									stage._monitor.render++;
								}
							}
						}
					}
				}
				var list = self.list;
				if (list) {
					var node = list.head;
					var curr;
					while (node) {
						curr = node[1];
						curr._render(
							context,
							regions,
							hidden,
							regionmax
						);
						node = node[2];
					}
				}
				// reset alpha
				if (CANVAS_MODE && self.alpha < 1) {
					context.globalAlpha = alpha;
				}
			},
			// render object
			// actual extension will use
			// function(context, regions)
			// @param {Object} context
			// @param {Array} regions
			render: function() {
			},
			// calculate matrix and bounds
			calculate: function() {

				// calculate matrix
				var self = this;

				// return if specified matrix set null
				var specifiedMatrix = self.specifiedMatrix;
				if (specifiedMatrix === null) {
					delete self.specifiedMatrix;
					return;
				}

				// prepare properties
				var props = self.props;
				var parent = self.parent;
				var simple = self.simple === true;

				// prepare matrix
				var matrix = self.matrix = [1,0,0,1,0,0];
				// translate for base X, Y
				if (props.baseX !== 0 || props.baseY !== 0) {
					Matrix.translate(matrix, htmlratio(-props.baseX), htmlratio(-props.baseY));
				}
				if (specifiedMatrix === undefined) {
					// rotate if not simple
					if (!simple) {
						// normalize angle
						var angle = props.angle;
						if (angle > PI_DOUBLE || angle < -PI_DOUBLE) {
							angle = angle % PI_DOUBLE;
						}
						if (angle < 0) {
							angle += PI_DOUBLE;
						}
						// rotation
						if (angle > 0) {
							Matrix.rotate(matrix, angle);
						}
						// scaling
						if (props.scaleX !== 1 || props.scaleY !== 1) {
							Matrix.scale(matrix, props.scaleX, props.scaleY);
						}
					}
					// translating
					if (props.x !== 0 || props.y !== 0) {
						Matrix.translate(matrix, htmlratio(props.x), htmlratio(props.y));
					}
				} else {
					// applly next matrix value
					if (specifiedMatrix !== null) {
						Matrix.concat(matrix, matrix, specifiedMatrix);
					}
					// clear next matrix
					delete self.specifiedMatrix;
				}

				if (HTML_MODE) {
					// set transfrom matrix in HTML mode
					matrix[4] = round(matrix[4]);
					matrix[5] = round(matrix[5]);
					css(self.html, {
						'-webkit-transform': 'matrix('+matrix.join(',')+')'
					});
				}

				// concatnate
				if (parent) {
					var pmatrix = parent.matrix;
					if (simple) {
						matrix[4] += pmatrix[4];
						matrix[5] += pmatrix[5];
					} else {
						Matrix.concat(matrix, matrix, pmatrix);
					}
				}

				// calculate region
				var source = self.source;
				var w, h;
				var mask = self.regionmask;
				if (CANVAS_MODE) {
					if (source) {
						w = source.width;
						h = source.height;
					} else {
						w = self.width  * pixelRatio;
						h = self.height * pixelRatio;
					}
				} else {
					if (source) {
						w = source.width / pixelRatio;
						h = source.height / pixelRatio;
					} else {
						w = self.width;
						h = self.height;
					}
				}
				var region;
				if (simple) {
					region = self.region = [
						floor(matrix[4]),
						floor(matrix[5]),
						ceil(w),
						ceil(h)
					];
					// hide mask with setting maximum region.
					if (mask) {
						self.regionmax = [
							region[0] + mask[0],
							region[1] + mask[1],
							mask[2],
							mask[3]
						];
					}
				} else {
					region = self.region = Matrix.region(matrix, [0, 0, w, h]);
					// hide mask with setting maximum region
					if (mask) {
						var regionmax = [mask[0], mask[1], mask[2], mask[3]];
						self.regionmax = Matrix.region(matrix, regionmax);
					}
				}
			},
			// rotate
			rotate: function(angle) {
				var self = this;
				var props = self.props;
				props.angle += angle;
				return self;
			},
			// translate
			translate: function(tx, ty) {
				var self = this;
				var props = self.props;
				props.x += tx;
				props.y += ty;
				return self;
			},
			// scale
			scale: function(sx, sy) {
				var self = this;
				var props = self.props;
				props.scaleX = sx;
				props.scaleY = sy === undefined ? sx : sy;
				return self;
			},
			// get stage of this object
			stage: function() {
				var self = this;
				while (self.parent) {
					self = self.parent;
				}
				return self._stage;
			},
			// show this object
			show: function() {
				var self = this;
				if (CANVAS_MODE) {
					if (self.hidden) {
						self.update();
					}
				} else {
					css(self.html, { display: 'block' });
				}
				delete self.hidden;
				return self;
			},
			// hide this object
			hide: function() {
				var self = this;
				if (CANVAS_MODE) {
					if (!self.hidden) {
						self.update();
					}
				} else {
					css(self.html, { display: 'none' });
				}
				self.hidden = true;
				return self;
			},
			// add object to sprite
			add: function() {
				var self = this;
				var stage = self.stage();
				var args = fixArgs(arguments);
				var added = function() {
					this.emit('added');
				};

				for (var i = 0; i < args.length; i++) {
					var object = args[i];
					if (object.parent !== null) {
						object.remove();
					}
					object.parent = self;
					if (self.list === null) {
						self.list = createLinkedList();
					}
					self.list.push(object);
					if (HTML_MODE) {
						self._htmlContainer().appendChild(object.html);
					}
					object.parent = self;
					object.update();
					if (stage) {
						object.visit(added);
					}
				}
				return self;
			},
			// remove object from sprite
			remove: function() {
				var self = this;
				var parent = self.parent;
				if (parent) {
					parent.list.remove(self);
					if (HTML_MODE) {
						parent._htmlContainer().removeChild(self.html);
					}
					// add removed region to redraw list
					var stage = self.stage();
					if (stage) {
						self._region(stage.redraws);
					}
					self.visit(function() {
						this.emit('removed');
					});
					self.parent = null;
				}
				return self;
			},
			_htmlContainer: function() {
				var self = this;
				var html = self.html;
				if (html.container) {
					return html.container;
				}
				var container = createElement('div', {'class':'tofu tofu-container'});
				html.appendChild(container);
				html.container = container;
				return container;
			},
			// iterate children
			each: function(callback) {
				var self = this;
				var list = self.list;
				if (list) {
					list.each(callback);
				}
			},
			// visit all children
			visit: function(callback, args) {
				var self = this;
				args = args || [];
				// apply callback
				callback.apply(self, args);
				// visit all children
				var list = self.list;
				if (list) {
					var node = list.head;
					var curr;
					while (node) {
						curr = node[1];
						if (curr) {
							curr.visit(callback, args);
						}
						node = node[2];
					}
				}
			},
			// remove all children
			empty: function() {
				var self = this;
				var list = self.list;
				if (list) {
					while (list.head && list.head[1]) {
						list.head[1].remove();
					}
				}
			},
			// mask thie object with rectangle
			mask: function(x, y, width, height) {
				var self = this;
				if (CANVAS_MODE) {
					self.regionmask = [
						floor(x * pixelRatio),
						floor(y * pixelRatio),
						ceil(width * pixelRatio),
						ceil(height * pixelRatio)
					];
				} else {
					css(self._htmlContainer(), {
						paddingLeft: px(x),
						paddingTop : px(y),
						width: px(width),
						height: px(height),
						overflow: 'hidden'
					});
				}
			},
			disableTouchPropagation: function() {
				var self = this;
				self.on('tap', stopPropagation);
				self.on('touchstart', stopPropagation);
				self.on('touchend', stopPropagation);
				self.on('touchcancel', stopPropagation);
			}
		};
		// define properties to prototype
		// Memory leak detected when use defineProperty to instances.
		// Avoid leak to define properties in the prototype object.
		// We should extend properties carefully.
		proto.__props__ = {};
		['x','y','scaleX','scaleY','baseX','baseY','angle','alpha'].forEach(function(name) {
			function get() {
				return this.props[name];
			}

			var alpha =
				name === 'alpha';

			var noupdate =
				name === 'x' ||
				name === 'y' ||
				name === 'alpha';

			var draw =
				name === 'angle' ||
				name === 'scaleX' ||
				name === 'scaleY';

			var resetMatrix =
				name === 'x' ||
				name === 'y' ||
				name === 'angle' ||
				name === 'scaleX' ||
				name === 'scaleY';

			function set(value) {
				var self = this;
				var props = self.props;
				var curr = props[name];
				// alpha value
				if (HTML_MODE && alpha) {
					// set opacity if MODE is html
					if (value === 1) {
						self.html.style.opacity = '';
					} else {
						self.html.style.opacity = value;
					}
				}
				// reset next matrix if angle or scale specified
				if (resetMatrix) {
					delete self.specifiedMatrix;
				}
				// do nothing if not changed
				if (curr === value) {
					return;
				}
				// set property
				self.props[name] = value;
				// mark update
				if (noupdate) {
					return;
				}
				self.update(draw);
			}
			var define = {
				get: get,
				set: set,
				enumerable: true
			};
			Object.defineProperty(proto, name, define);
			proto.__props__[name] = define;
		});
		return proto;
	});

	var Sprite = extend(DisplayObject, function Sprite() {}, function() {

		return {
			init: function(options) {
				options = options || {};
				var self = this;
				self.source = null;
				self.canvas = null;
				self.context = null;
			},
			// init source as canvas
			initCanvas: function(width, height) {
				var self = this;
				var context = createContext(ratio(width), ratio(height));
				context.scale(pixelRatio, pixelRatio);
				var canvas = context.canvas;
				self.source = canvas;
				self.context = context;
				var props = self.props;
				props.width = width;
				props.height = height;
				if (HTML_MODE) {
					css(self.html, {
						backgroundImage: '-webkit-canvas('+canvas.id+')',
						width: px(width),
						height: px(height)
					});
				}
			},
			initContext: function(context) {
				var self = this;
				var canvas = context.canvas;
				self.context = context;
				self.source = canvas;
				var width  = round(canvas.width  / pixelRatio);
				var height = round(canvas.height / pixelRatio);
				var props = self.props;
				props.width = width;
				props.height = height;
				if (HTML_MODE) {
					css(self.html, {
						backgroundImage: '-webkit-canvas('+canvas.id+')',
						width: px(width),
						height: px(height)
					});
				}
			},
			initImage: function(source) {
				var self = this;
				var image = source.image;
				var x = 'x' in source ? source.x : 0;
				var y = 'y' in source ? source.y : 0;
				var width = 'width' in source ? source.width : image.width;
				var height = 'height' in source ? source.height : image.height;
				var props = self.props;
				props.width = width;
				props.height = height;
				if (CANVAS_MODE) {
					self.source = {
						image: image,
						x: x,
						y: y,
						width: width,
						height: height,
						persist: source.persist === true
					};
				} else {
					var context = createContext(width, height);
					var canvas = context.canvas;
					drawImageDirect(context, image, x, y, width, height, 0, 0, width, height);
					self.source = canvas;

					css(self.html, {
						backgroundImage: '-webkit-canvas('+canvas.id+')',
						backgroundRepeat: 'no-repeat',
						width: px(floor(width/pixelRatio)),
						height: px(floor(height/pixelRatio))
					});
				}
			},
			destroy: function() {
				var self = this;
				var source = self.source;
				var canvas = self.canvas;
				if (source) {
					free(source);
				}
				if (canvas) {
					free(canvas);
				}
				self.source = null;
				self.canvas = null;
				self.context = null;
				// clean
				DisplayObject.prototype.destroy.apply(self);
			},
			draw: function() {
				var self = this;
				var source = self.source;
				var canvas = self.canvas;
				var simple = self.simple;
				var region = self.region;
				if (!source) {
					// return if source is not defined
					return;
				}
				if (region[2] <= 0 || region[3] <= 0) {
					// ignore 0 width,height region
					return;
				}
				if (simple) {
					// simple does not need to be drawn
					return;
				}
				var context;
				if (!canvas) {
					// context = self.context = createContext(region[2],region[3]);
					context = createContext(region[2], region[3]);
					canvas = self.canvas = context.canvas;
				} else {
					canvas.width = region[2];
					canvas.height = region[3];
					context = canvas.getContext('2d');
				}
				// apply matrix
				context.save();
				context.translate(-region[0], -region[1]);
				context.transform.apply(context, self.matrix);
				// move to region top/right
				if (source.image) {
					drawImageDirect(
						context,
						source.image,
						source.x,
						source.y,
						source.width,
						source.height,
						0,
						0,
						source.width,
						source.height);
				} else {
					// full image
					drawImageDirect(context, source,0,0);
				}
				context.restore();
			},
			render: function(context, regions) {
				var self = this;
				var canvas = self.canvas;
				var simple = self.simple;
				var source = self.source;

				if (simple && source) {
					canvas = source.image ? source.image : source;
				}
				if (!canvas) {
					// ignore if canvas does not exist
					return;
				}
				var region = self.region;
				if (regions) {
					var length = regions.length;
					for (var i = 0; i < length; i++) {
						var iregion = regions[i];
						if (iregion[2] === 0 || iregion[3] === 0) {
							// ignore no area
							return;
						}
						drawImageDirect(
							context,
							canvas,
							abs(region[0] - iregion[0]),
							abs(region[1] - iregion[1]),
							iregion[2],
							iregion[3],
							iregion[0],
							iregion[1],
							iregion[2],
							iregion[3]
						);
					}
				} else {
					drawImageDirect(context, canvas, region[0], region[1]);
				}
			}
		};
	});

	/**
	 * Sprite which has graphic layer
	 */
	var Graphics = extend(Sprite, function Graphics() {}, function() {
		var proto = {
			init: function(options) {
				options = options || {};
				var self = this;
				var width = self.width = options.width || 1;
				var height = self.height = options.height || 1;
				self.initCanvas(width, height);
				var context = self.context;
				self.graphics = context;
				self.queue = [];

				// load resources for this graphics
				self.resources = {};

				var resources = options.resources || {};
				var loadCount = 0;

				function load(name) {
					var image = new Image();
					self.resources[name] = image;
					image.onload = function() {
						if (--loadCount === 0) {
							resourceComplete();
						}
					};
					image.onerror = function() {
						console.error('Failed to load image ' + image.src);
						if (--loadCount === 0) {
							resourceComplete();
						}
					};
					image.src = imageUrl(resources[name]);
				}

				for (var name in resources) {
					load(name, resources[name]);
					loadCount++;
				}

				var timerId = 0;
				function resourceComplete() {
					if (timerId) {
						clearTimeout(timerId);
						timerId = 0;
					}
					self.emit('resources');
				}
				if (loadCount > 0) {
					timerId = setTimeout(resourceComplete, options.timeout || 5000);
				} else {
					setTimeout(function() {
						self.emit('resources');
					},0);
				}
			},
			destroy: function() {
				var self = this;
				self.graphics = null;
				self.queue = null;
				self.resources = null;
				Sprite.prototype.destroy.apply(self, arguments);
			},
			/**
			 * Measure text size and returns width.
			 */
			measure: function(text, font) {
				var self = this;
				var graphics = self.graphics;
				if (font) {
					graphics.save();
					graphics.font = font;
				}
				var measure = graphics.measureText(text);
				if (font) {
					graphics.restore();
				}
				return measure.width;
			},
			resize: function(width,height) {
				var self = this;
				self.width = width;
				self.height = height;
				if (HTML_MODE) {
					css(self.html, {
						width: px(width),
						height: px(height)
					});
				}
				width = width * pixelRatio;
				height = height * pixelRatio;
				var canvas = self.source;
				canvas.width = width;
				canvas.height = height;
				var context = self.graphics;
				context.scale(pixelRatio, pixelRatio);
			},
			clear: function() {
				var self = this;
				if (self.source) {
					var canvas = self.source;
					canvas.width = canvas.width;
					var context = self.graphics;
					context.scale(pixelRatio, pixelRatio);
					self.update();
				}
			},
			_lineRoundRect: function(x, y, width, height, elt, ert, erb, elb) {
				var self = this;
				elt = elt === undefined ? 10 : elt;
				ert = ert === undefined ? elt : ert;
				erb = erb === undefined ? elt : erb;
				elb = elb === undefined ? elt : elb;

				var x1 = x;
				var y1 = y;
				var x2 = x1 + width;
				var y2 = y1 + height;

				var graphics = self.graphics;
				graphics.beginPath();
				graphics.moveTo(x1 + elt, y1);
				graphics.arcTo(x2, y1, x2    , y1+ert, ert);
				graphics.arcTo(x2, y2, x2-erb, y2    , erb);
				graphics.arcTo(x1, y2, x1    , y2-elb, elb);
				graphics.arcTo(x1, y1, x1+elt, y1    , elt);
				graphics.closePath();
			},
			drawRoundRect: function() {
				var self = this;
				self._lineRoundRect.apply(self, arguments);
				self.fill();
				self.stroke();
			},
			strokeRoundRect: function() {
				var self = this;
				self._lineRoundRect.apply(self, arguments);
				self.stroke();
			},
			fillRoundRect: function() {
				var self = this;
				self._lineRoundRect.apply(self, arguments);
				self.fill();
			},
			clipRoundRect: function(){
				var self = this;
				self._lineRoundRect.apply(self, arguments);
				self.clip();
			},
			fillImage: function(image, repeat, x, y, width, height) {
				var self = this;
				if (typeof image === 'string') {
					image = self.resources[image];
				}
				if (!image) {
					return;
				}
				var graphics = self.graphics;
				graphics.save();
				graphics.setTransform(1,0,0,1,floor(x * pixelRatio),floor(y * pixelRatio));
				graphics.fillStyle = graphics.createPattern(image, repeat);
				graphics.fillRect(0,0, floor(width * pixelRatio), floor(height * pixelRatio));
				graphics.restore();
			},
			linearGradient: function(x0,y0,x1,y1) {
				var stops = fixArgs(arguments).slice(4);
				var self = this;
				var graphics = self.graphics;
				var grad = graphics.createLinearGradient(x0,y0,x1,y1);
				for (var i = 0; i < stops.length; i++) {
					var stop = stops[i];
					grad.addColorStop(stop[0], stop[1]);
				}
				// reset alpha for android bug
				graphics.fillStyle = '#000';
				graphics.fillStyle = grad;
			},
			drawImage: function(image) {
				var self = this;
				var args = fixArgs(arguments);
				// add default position
				if (args.length === 1) {
					args[1] = 0;
					args[2] = 0;
				}
				var graphics = self.graphics;
				var emitter = init(EventEmitter);
				// push context to args
				args.unshift(graphics);
				if (typeof image === 'string') {
					var img = self.resources[image];
					if (img) {
						// find loaded resource
						img = self.resources[image];
						args[1] = img;
						drawImage.apply(self, args);
						emitter.emit('load');
					} else {
						// load and draw asynchronously if URL set
						img = new Image();
						img.onload = function() {
							args[1] = img;
							drawImage.apply(self, args);
							// mark as redraw
							self.update(true);
							// save resource as cache for next draw
							self.resources[image] = img;
							// emit load
							emitter.emit('load');
						};
						img.src = imageUrl(image);
					}
				} else {
					args[1] = image;
					drawImage.apply(self, args);
					emitter.emit('load');
				}
				return emitter;
			},
			drawText: function(options) {
				options.context = this.graphics;
				drawText(options);
			}
		};

		proto.__props__ = {};
		// canvas context property proxy
		[
			'strokeStyle','fillStyle','lineWidth','lineCap','lineJoin','miterLimit',
			'shadowColor','shadowOffsetX','shadowOffsetY','shadowBlur',
			'font','textAlign','textBaseline','globalAlpha','globalCompositeOperation'
		].forEach(function(name) {
			var define = {
				get: function() {
					return this.graphics[name];
				},
				set: function(value) {
					this.graphics[name] = value;
				},
				enumerable: true,
				configurabe: true
			};
			Object.defineProperty(proto, name, define);
			proto.__props__[name] = define;
		});

		// canvas function proxy
		[
			'beginPath','moveTo','closePath','lineTo','quadraticCurveTo','bezierCurveTo',
			'fill','arcTo','arc','rect','stroke','clip',
			'fillRect','strokeRect',
			'fillText','strokeText',
			'save','restore',
			'isPointInPath','measureText',
			'createLinearGradient','createRadialGradient','createPattern'
		].forEach(function(name) {
			proto[name] = function() {
				var self = this;
				var graphics = self.graphics;
				return graphics[name].apply(graphics, arguments);
			};
		});

		// clearRect should be optimized
		proto.clearRect = function() {
			var self = this;
			var graphics = self.graphics;
			if (clearRect.apply(graphics, arguments)) {
				graphics.scale(pixelRatio, pixelRatio);
			}
		};

		return proto;
	});

	// this clearRect avoid call with same size of canvas
	// which cause crash some android browsers.
	function clearRect(x, y, width, height) {
		var context = this;
		var canvas = context.canvas;
		// avoid clearRect with same size of canvas
		if (canvas.width === width && canvas.height === height) {
			canvas.width = width;
			return true;
		} else {
			context.clearRect(x, y, width, height);
			return false;
		}
	}

	var TextField = extend(Graphics, function TextField() {}, function() {
		return {
			init: function(options) {
				var self = this;
				self.options = options || {};
				self.x = options.x || 0;
				self.y = options.y || 0;
				options.x = 0;
				options.y = 0;

				if (options.text) {
					options.context = self.graphics;
					drawText(options);
				}
			},
			fillText:function(str, newOptions){
				var self = this;
				newOptions = newOptions || self.options;
				newOptions.text = str;
				newOptions.context = self.graphics;

				self.clear();
				drawText(newOptions);
				self.update(true);
			},
			drawHtmlText: function(str, newOptions){
				var self = this;
				newOptions = newOptions || self.options;
				newOptions.text = str;
				newOptions.context = self.graphics;

				self.clear();
				// TODO implement
				// drawHtmlText(str, self.graphics, 0,0, newOptions);
				self.update(true);
			}
		};
	});

	/**
	 * Extend sprite which has simple image element.
	 */
	var Bitmap = extend(Sprite, function Bitmaps() {}, function() {
		return {
			init: function(options) {
				options = options || {};
				var self = this;
				// image url
				self.url = imageUrl(options.url);
				// image must be scaled
				var image = new Image();
				image.onload = function() {
					var img = this;
					self.initImage({ image: img });
					self.update(true);
					self.emit('load');
				};
				image.src = self.url;
				image = null;
				return self;
			}
		};
	});

	/**
	 * Image which embeds JSON data as pixels on footer of the image.
	 */
	var EmbeddedImage = extend(EventEmitter, function EmbeddedImage() {}, function() {

		// constants
		var SIGNATURE = 'EMB';
		var RGBA_SIZE = 4;
		var RGB_SIZE = 3;
		var BITS_PER_BYTE = 8;
		var BYTES_STR_LENGTH = 2;
		var BYTES_SIGNATURE_LENGTH = 3;

		return {
			init: function(options) {

				options = options || {};
				var self = this;
				var img = new Image();
				img.crossOrigin = '';
				img.onload = function() {

					var width = img.width;
					var height = img.height;

					var context = createContext(width, height);
					var canvas = context.canvas;
					drawImageDirect(context, img,0,0);

					function getImageData(callback) {
						var data;
						try {
							data = context.getImageData(0,0,width,height).data;
						} catch (e) {
							// try to load from JSON if security error caused
							var jsonUrl = img.src.replace(/\.png$/, '.json');
							var http = new XMLHttpRequest();
							http.onreadystatechange = function() {
								if (http.readyState === 4) {
									if (http.status === 200) {
										callback(JSON.parse(http.responseText));
									} else if (http.status >= 400) {
										// error
										console.error('Failed to load json data ' + jsonUrl);
									}
								}
							};
							http.open('get', jsonUrl, true);
							http.send();
							return;
						}

						// data length including image part and extra data part
						var length = height * width * RGBA_SIZE;
						var currentPosition = length - 4;
						var sign = fromCharCode(
							data[currentPosition],
							data[currentPosition + 1],
							data[currentPosition + 2]
						);
						if (sign !== SIGNATURE) {
							throw new Error('no embedded data');
						}
						currentPosition = currentPosition - 3;
						var strLength = data[currentPosition] << BITS_PER_BYTE | (data[currentPosition + 1]);
						var numExtraLines = ceil((strLength + BYTES_STR_LENGTH + BYTES_SIGNATURE_LENGTH) / (width * RGB_SIZE));
						var imageHeight = height - numExtraLines;
						// data length of extra data part excluding alpha data (1 byte for each pixel 4 bytes)
						var extraLength = width * RGB_SIZE * numExtraLines;
						// data length of alignment excluding alpha data (1 byte for each pixel 4 bytes)
						var alignLength = extraLength - (strLength + BYTES_STR_LENGTH + BYTES_SIGNATURE_LENGTH);
						var extraStartPosition = imageHeight * width * RGBA_SIZE;
						var strStartPosition = extraStartPosition + alignLength +
							// add alpha data length
							floor(alignLength / RGB_SIZE);
						var text = '';
						var i;

						currentPosition = strStartPosition;
						for (i = 0; i < strLength; i++) {
							text += fromCharCode(data[currentPosition++]);
							if ((currentPosition - extraStartPosition + 1) % RGBA_SIZE === 0) {
								currentPosition++;
							}
						}
						callback(JSON.parse(text));
					}

					getImageData(function(data) {
						self.data = data;
						// release canvas
						free(canvas);
						self.prepare();
						self.emit('load');
					});
				};
				img.onerror = function(e) {
					self.emit('error',e);
				};
				img.src = imageUrl(options.url);
				self.image = img;
			},
			prepare: function() {
			},
			destroy: function() {
				var self = this;
				EventEmitter.prototype.destroy.call(self);
				delete self.image;
				delete self.data;
			},
			ready: function(handler) {
				var self = this;
				if (self.data) {
					handler.apply(self);
				} else {
					self.on('load', handler);
				}
			},
			release: function() {
				var self = this;
				var image = self.image;
				releaseImage(image);
				delete self.image;
			}
		};
	});

	var SpriteSheet = extend(EmbeddedImage, function SpriteSheet() {}, function() {

		function recursive(name, data, refs, image) {
			if (name && data.dest) {
				// adjust coordinates
				data.x = 'x' in data ? data.x : 0;
				data.y = 'y' in data ? data.y : 0;
				data.image = image;
				refs[name] = data;
				return;
			}
			var children = data.children || data;
			for (var cname in children) {
				var child = children[cname];
				cname = name ? name + '.' + cname : cname;
				recursive(cname, child, refs, image);
			}
		}

		return {
			init: function(options) {
				options = options || {};
				var self = this;
				self.sprites = {};
			},
			prepare: function() {
				var self = this;
				recursive('', self.data, self.sprites, self.image);
			},
			release: function() {
				EmbeddedImage.prototype.release.apply(this);
			},
			destroy: function() {
				var self = this;
				EmbeddedImage.prototype.destroy.call(self);
			},
			create: function(name, options) {
				var self = this;
				var ref = self.sprites[name];
				if (!ref) {
					throw new Error(name + ' does not exist');
				}
				options = options || {};
				options.sheet = self;
				options.data = ref;
				return new SpriteBitmap().init(options);
			},
			get: function(name) {
				var self = this;
				return self.sprites[name];
			},
			each: function(handler) {
				var self = this;
				var sprites = self.sprites;
				for (var name in sprites) {
					handler.call(self, name, sprites[name]);
				}
			},
			has:function(name){
				var self = this;
				return name in self.sprites;
			}
		};
	});

	/**
	 * Sprite which combined images in SpriteSheet.
	 */
	var CombinedSheet = extend(Sprite, function CombinedSheet() {}, function() {
		return {
			init: function(opts) {
				var self = this;
				if (opts.base) {
					// set proper base
					self.base = opts.base;
				} else {
					// default base
					self.base = {
						base: { x: 0, y : 0 },
						width: 0,
						height: 0
					};
				}
				if (opts.list) {
					self.combine(opts.list);
				}
			},
			combine: function(list) {

				var self = this;

				if (list.length === 0) {
					return;
				}

				var base = self.base;
				var sheets = [];

				// choose base as first element
				var xmin = -base.base.x;
				var ymin = -base.base.y;
				var xmax = xmin + base.width;
				var ymax = ymin + base.height;

				if (list.length === 1) {
					// mark length 1
					var part = list[0];
					// return direct object if object has only 1 instance
					if (part) {
						self._lengthOne = true;
						self.baseX = round(part.base.x / pixelRatio);
						self.baseY = round(part.base.y / pixelRatio);
						self.width = part.width;
						self.height = part.height;
						self.initImage({
							image: part.image,
							x: part.dest.x,
							y: part.dest.y,
							width: part.width,
							height: part.height,
							persist: true
						});
					}
					return;
				} else if (self._lengthOne) {
					// reset context if length increase from one
					delete self._lengthOne;
					self.source = null;
					self.context = null;
				}

				var i, sheet;

				// calculate rectangles of sprites
				for (i = 0; i < list.length; i++) {

					sheet = list[i];

					if (!sheet) {
						// skip unregistered sheet
						continue;
					}

					sheets.push(sheet);

					if (sheet === base) {
						// skip calculation if sheet equals to base
						continue;
					}

					var top = sheet.y - sheet.base.y;
					var bottom = top + sheet.height;
					var left  = sheet.x - sheet.base.x;
					var right = left + sheet.width;

					xmin = (xmin < left  ) ? xmin : left;
					xmax = (xmax > right ) ? xmax : right;
					ymin = (ymin < top   ) ? ymin : top;
					ymax = (ymax > bottom) ? ymax : bottom;
				}

				// calculate difference of expanded area
				var width  = xmax - xmin;
				var height = ymax - ymin;

				// create sheet graphics
				var canvas = self.source;
				var context = self.context;
				if (canvas) {
					canvas.width = width;
					canvas.height = height;
					self.width = round(width / pixelRatio);
					self.height = round(height / pixelRatio);
				} else {
					context = createContext(width, height);
					canvas = context.canvas;
					self.initContext(context);
				}

				self.baseX = round(-xmin / pixelRatio);
				self.baseY = round(-ymin / pixelRatio);

				// combine sheets
				for (i = 0; i < sheets.length; i++) {
					sheet = sheets[i];
					if (base === sheet) {
						drawImageDirect(
							context,
							base.image,
							base.dest.x,
							base.dest.y,
							base.width,
							base.height,
							- base.base.x - xmin,
							- base.base.y - ymin,
							base.width,
							base.height
						);
					} else {
						drawImageDirect(
							context,
							sheet.image,
							sheet.dest.x,
							sheet.dest.y,
							sheet.width,
							sheet.height,
							sheet.x - sheet.base.x - xmin,
							sheet.y - sheet.base.y - ymin,
							sheet.width,
							sheet.height
						);
					}
				}
			}
		};
	});

	var SpriteBitmap = extend(Sprite, function SpriteBitmap() {}, function() {
		return {
			init: function(options) {
				options = options || {};
				var self = this;
				var data = options.data;
				var sheet = self.sheet = options.sheet;
				self.initImage({
					image: sheet.image,
					x: data.dest.x * pixelRatio,
					y: data.dest.y * pixelRatio,
					width: data.width * pixelRatio,
					height: data.height * pixelRatio,
					persist: true
				});
				self.props.baseX = data.base.x;
				self.props.baseY = data.base.y;
				self.props.x = 'x' in options ? options.x : data.x;
				self.props.y = 'y' in options ? options.y : data.y;
			},
			// change image to another ref
			change: function(name) {
				var self = this;
				var data = self.sheet.sprites[name];
				if (data) {
					var source = self.source;
					// reset source coordinates
					source.x = data.dest.x;
					source.y = data.dest.y;
					source.width = data.width;
					source.height = data.height;
				}
			}
		};
	});

	var CutoffAnimationSheet = (function() {
		var CutoffAnimationSheet = function() {
		};
		CutoffAnimationSheet.prototype = {
			init: function(options) {
				options = options || {};
				var self = this;
				var positionKey;
				var name;
				self.names = [];
				self.spritesheet = options.sheet;
				for (positionKey in self.spritesheet.sprites) {
					self.spritesheet.sprites[positionKey].base = {x:0, y:0};
				}
				for (name in self.spritesheet.data) {
					if (name.indexOf('positions') < 0) {
						self.names.push(name);
					}
				}
				return self;
			},
			create: function(name) {
				var self = this;
				var indices = self.spritesheet.data[name];
				if (!indices) {
					throw new Error(name + ' does not exist');
				}
				var spriteArray = [];
				for (var i = 0, l = indices.length; i < l; i++) {
					spriteArray.push(
						self.spritesheet.create('positions.' + indices[i]));
				}
				return new CutoffAnimation().init({sprites: spriteArray});
			}
		};
		return CutoffAnimationSheet;
	}());

	var CutoffAnimation = extend(Sprite, function CutoffAnimation() {}, function() {
		return {
			init: function(options) {
				options = options || {};
				var self = this;
				var sprites = options.sprites || [];
				self.frames = sprites;
				self.currentFrame = 0;
				self.totalFrames = sprites.length;
				self.currentSprite = self.frames[self.currentFrame];
				self.add(self.currentSprite);
				self.update();
				self._doNothing = function() {};
				self._stageListener = self._doNothing;
				self.enterframe = function() {
					self.nextFrame();
				};
				self.on('added', function() {
					self.play();
				});
				self.on('removed', function() {
					self.stop();
				});
			},
			nextFrame: function() {
				var self = this;
				self.currentFrame++;
				self.currentFrame %= self.totalFrames;
				self.remove(self.currentSprite);
				self.currentSprite = self.frames[self.currentFrame];
				self.add(self.currentSprite);
				self.update();
			},
			play: function() {
				var self = this;
				self.stage().on('enterframe', self.enterframe);
			},
			stop: function() {
				var self = this;
				self.stage().off('enterframe', self.enterframe);
			}
		};
	});


	function MotionPlayer() {
	}
	MotionPlayer.prototype = {
		init: function() {
			var self = this;
			self.motions = {};
			self.playings = {};
			return self;
		},
		has: function(name) {
			return name in this.motions;
		},
		// register new motion data
		register: function(name, data) {
			var self = this;
			for (var oname in data) {
				var parts = data[oname];
				for (var partname in parts) {
					// skip flags
					if (partname === 'flags') {
						continue;
					}
					var partdata = parts[partname];
					for (var i = 0; i < partdata.length; i++) {
						var partmatrix = partdata[i];
						if (partmatrix) {
							partmatrix[4] = round(partmatrix[4] * htmlRatio / 2);
							partmatrix[5] = round(partmatrix[5] * htmlRatio / 2);
						}
					}
				}
			}
			var motions = self.motions;
			motions[name] = data;
			return self;
		},
		// apply motion to sprite
		play: function(name, target, opts) {
			opts = opts || {};
			var self = this;
			var repeat = opts.repeat === true;
			// callback for completion of motion
			var data = self.motions[name];
			if (!data) {
				console.error('motion',name,'is not registered');
				return;
			}
			var emitter = init(EventEmitter);
			var playings = self.playings;
			for (var tname in target) {
				// target object
				var mtarget = target[tname];
				// get motion data
				var mdata = data[tname];
				var totalFrame = 0;
				for (var pname in mdata) {
					totalFrame = mdata[pname].length;
				}
				if (mdata) {
					playings[mtarget.id] = {
						name: tname,
						target: mtarget,
						repeat: repeat,
						data: mdata,
						totalFrame: totalFrame,
						emitter: emitter,
						frame: 0
					};
				}
			}
			return emitter;
		},
		// proceed all objects which applied
		proceed: function() {
			var self = this;
			var playings = self.playings;
			var i;
			for (var oid in playings) {
				var playing = playings[oid];

				if (playing.end) {
					// end marked animation
					playing.emitter.emit('complete');
					playing.emitter.destroy();
					// delete reference
					delete playings[oid];
					// skip
					continue;
				}

				var frame = playing.frame;
				var totalFrame = playing.totalFrame;
				var target = playing.target;
				var data = playing.data;
				for (var name in data) {
					var object = target[name];
					var array = data[name];
					if (object && array) {
						var matrix = array[frame];
						//array
						if (isArray(object)) {
							for(i = 0; i < object.length; i++){
								var o = object[i];
								o.specifiedMatrix = matrix;
								if (matrix) {
									o.update();
								}
							}
						} else {
							object.specifiedMatrix = matrix;
							if (matrix) {
								object.update();
							}
						}
					} else if (name === 'flags') {
						var flags = array[frame];
						if (flags) {
							playing.emitter.emit('flags', flags);
						}
					}
				}
				playing.frame = frame + 1;
				if (playing.frame >= totalFrame) {
					if (playing.repeat) {
						playing.frame = 0;
					} else {
						playing.end = true;
					}
				}
			}
			return self;
		},

		// stop object
		stop: function(id, callback) {
			var self = this;
			var playing = self.playings[id];
			if (playing) {
				if (callback) {
					// disable repeat
					playing.repeat = false;
					if (callback) {
						playing.emitter.on('complete', callback);
					}
				} else {
					// stop immediately
					delete self.playings[id];
				}
			}
			return self;
		}
	};

	/**
	 * Structed Placer which construct sprite
	 * with JSON definitions
	 * {
	 *   "id": "test",
	 *   "x": 100,
	 *   "y": 50,
	 *   "type": "sprite",
	 *   "resources": {
	 *   },
	 *   "children": [
	 *   {
	 *     "id": "test1",
	 *     "x": 100,
	 *     "y": 50,
	 *     "type": "image",
	 *     "url": "/img/content/xxx${ratio}.png"
	 *   },
	 *   {
	 *     "id": "test2",
	 *     "x": 200,
	 *     "y": 50,
	 *     "type": "sheet",
	 *     "url": "/img/content/sheet${ratio}.png",
	 *     "name": "parts-name-in-sheet"
	 *   },
	 *   {
	 *    "id": "test3",
	 *    "type": "graphics",
	 *    "x": 50,
	 *    "y": 80,
	 *    "draw": [
	 *		{ "fillStyle": "#000" },
	 *		{ "fillRect": [0,0,100,100] }
	 *    ],
	 *    "children": [{
	 *        "id": "test3-1",
	 *        "type": "text",
	 *        "text": "AABBCCDD",
	 *        "size": "24px",
	 *        "font": "sans-seris",
	 *        "color": "#333"
	 *    }]
	 *   },
	 *   {
	 *    "id": "test4",
	 *    "type": "json",
	 *    "url": "/xxx/yyy/zzz.json",
	 *    "x": 20,
	 *    "y": 30
	 *   }
	 *   ..
	 *   ]
	 * }
	 */
	function TofuPlacer(item, option) {
		this.item = item;
		this.option = option || {};
	}
	TofuPlacer.prototype = {

		/**
		 * place items to container
		 */
		place: function() {

			var self = this;
			var item = self.item;

			// place items
			function placeItems(items, container) {
				var ilen = items.length;
				for (var i = 0; i < ilen; i++) {
					var item = items[i];
					placeItem(item, container);
				}
			}

			// place item
			function placeItem(item, container) {
				var type = item.type;
				var object;
				if (type === 'image') {
					object = tofu.createBitmap(item);
				} else if (type === 'graphics') {
					object = tofu.createGraphics(item);
					// handle drawings
					var drawItem = function(draw) {
						for (var name in draw) {
							var prop = object[name];
							var args = draw[name];
							if (typeof prop === 'function') {
								if ('length' in args) {
									object[name].apply(object, args);
								} else {
									object[name].call(object, args);
								}
							} else {
								object[name] = args;
							}
						}
					};
					var drawItems = function(noupdate) {
						if (item.draws) {
							item.draws.forEach(drawItem);
							if (noupdate !== true) {
								object.update(true);
							}
						}
					};
					if (item.resources) {
						object.on('resources', drawItems);
					} else  {
						drawItems(true);
					}
				} else if (type === 'sprite') {
					object = tofu.createSprite(item);
				} else if (type === 'spritebitmap') {
					// sprite bitmap
					// TODO implement
					object = null;
				}
				if (object) {
					// place object
					if (container) {
						container.add(object);
					}
					// search children and place recursively
					var children = item.children;
					if (children) {
						if ('length' in children) {
							placeItems(children, object);
						} else {
							placeItems([children], object);
						}
					}
				}
				return object;
			}
			// queueing functions
			var object = placeItem(item);
			object.update(true);
			return object;
		}
	};

	/**
	 * Tween Player
	 */
	var TweenPlayer = extend(EventEmitter, function TweenPlayer() {}, function() {

		var TYPE_MOVE = 0;
		var TYPE_LINE = 1;
		var TYPE_QUADRATIC = 2;
		var TYPE_BEZIER = 3;
		var TWEEN_ID_COUNTER = 1;

		var defaults = function(obj) {
			var i, l, source, sources = Array.prototype.slice.call(arguments, 1), prop;
			for (i = 0, l = sources.length; i < l; i++) {
				source = sources[i];
				for (prop in source) {
					if (!(prop in obj)) {
						obj[prop] = source[prop];
					}
				}
			}
			return obj;
		};

		var Tween = extend(EventEmitter, function Tween(target, duration, vars, options) {
			var self = this;
			EventEmitter.prototype.init.apply(this);
			self.vars = vars || {};
			options = options || {};
			if ('id' in options) {
				self.id = options.id + ('id' in target ? '.' + target.id : '');
			} else {
				self.id = TWEEN_ID_COUNTER++;
			}
			self.target = target;
			self.startFrame = null;
			self.duration = duration > 0 ? duration : 1;
			self.options = options;
			self.ease = options.ease || easing.linear.none;
			self.delay = options.delay || 0;
			self.release = false;
			self.path = options.path;
		}, function() {
			return {
				prepare: function() {
					var self = this;
					var options = self.options;
					var vars = self.vars;
					var initVars = self.initVars = {};
					for (var prop in vars) {
						initVars[prop] = self.target[prop] || 0;
					}
					self.vars = options.runBackwards ? initVars : vars;
					self.initVars = options.runBackwards ? vars : initVars;
				},
				update: function(time) {
					var self = this, prop;
					if (time < self.startFrame) {
						return false;
					}
					var t = (time - self.startFrame) / self.duration;
					var target = self.target;
					var ratio = self.ease(t,0,1,1);
					if (self.path) {
						var currentPath, currentLength = 0,
						endLength = ratio * self.path.length,
						l = self.path.paths.length, i = 0, diff, segmentRatio, x, y;
						do {
							currentPath = self.path.paths[i];
							i = min(i+1, l-1);
							currentLength += currentPath.length;
							diff = endLength - currentLength;
						} while(diff > 0 || currentPath.length <= 0);
						segmentRatio = (diff + currentPath.length) / currentPath.length;
						if (segmentRatio < 0) {
							segmentRatio = 0;
						} else if (segmentRatio > 1) {
							segmentRatio = 1;
						}
						if (currentPath.type === TYPE_LINE) {
							var prev = currentPath.prev;
							var startX = prev === null ? 0 : prev.dest[0];
							var startY = prev === null ? 0 : prev.dest[1];
							x = (currentPath.dest[0] - startX) * segmentRatio + startX;
							y = (currentPath.dest[1] - startY) * segmentRatio + startY;
						} else if (currentPath.type === TYPE_MOVE) {
							x = currentPath.dest[0];
							y = currentPath.dest[1];
						} else if (currentPath.type === TYPE_QUADRATIC) {
							var quadratic = currentPath.quadratic;
							x = quadratic.getX(segmentRatio);
							y = quadratic.getY(segmentRatio);
						} else if (currentPath.type === TYPE_BEZIER) {
							var bezier = currentPath.bezier;
							var iv = bezier.getInterveningVariableByRatio(segmentRatio);
							x = bezier.getX(iv);
							y = bezier.getY(iv);
						}
						target.x = x;
						target.y = y;
					} else {
						var initVars = self.initVars;
						var vars = self.vars;
						for (prop in vars) {
							target[prop] =
								(vars[prop] - initVars[prop]) * ratio + initVars[prop];
						}
					}

					// fix as integer value
					target.x = ~~(target.x);
					target.y = ~~(target.y);
					target.update();

					// emit update
					self.emit('update');

					if (t >= 1) {
						self.release = true;
						self.emit('complete');
					}

					return true;
				},
				to: function(target, duration, vars, options) {
					var self = this;
					var player = self.player;
					options.future = true;
					var next = player.to(target, duration, vars, options);
					self.on('complete', function() {
						player.register(next);
					});
					return next;
				},
				cancel: function() {
					this.release = true;
				}
			};
		});

		function Path() {
			var self = this;
			self.paths = [];
			self.length = 0;
			self._prev = null;
			self.onStart = null;
			self._currentPoint = null;
		}
		Path.prototype = {
			init: function(options) {
				var self = this;
				self.options = options || {};
			},
			moveTo: function(x, y) {
				var self = this;
				var path = {type: TYPE_MOVE, dest: [x, y], length: 0, prev: self._prev};
				self.paths.push(path);
				self._prev = path;
				self._currentPoint = [x, y];
				return self;
			},
			lineTo: function(x, y) {
				var self = this;
				var prevX = self._prev.dest[0];
				var prevY = self._prev.dest[1];
				var length = sqrt((x-prevX)*(x-prevX)+(y-prevY)*(y-prevY));
				self.length += length;
				var path = {type: TYPE_LINE, dest: [x, y], length: length, prev: self._prev};
				self.paths.push(path);
				self._prev = path;
				self._currentPoint = [x, y];
				return self;
			},
			quadraticCurveTo: function(cpx, cpy, x, y) {
				var self = this;
				var prevX = self._prev.dest[0];
				var prevY = self._prev.dest[1];
				var quadratic = new QuadraticCurve(prevX, prevY, x, y, cpx, cpy);
				var length = quadratic.length;
				var path = {type: TYPE_QUADRATIC, dest: [x, y], length: length, quadratic: quadratic, prev: self._prev };
				self.length += length;
				self.paths.push(path);
				self._prev = path;
				self._currentPoint = [x, y];
				return self;
			},
			bezierCurveTo: function(cp1x, cp1y, cp2x, cp2y, x, y, options) {
				var self = this, length;
				var prevX = self._prev.dest[0];
				var prevY = self._prev.dest[1];
				var delta = defaults(self.options, options).delta || 0.025;

				var bezier = new BezierCurve(prevX, prevY, cp1x, cp1y, cp2x, cp2y, x, y, delta, options);
				length = bezier.length;
				self.length += length;
				var path = {type: TYPE_BEZIER, dest:[x, y], length: length, bezier: bezier, prev: self._prev};
				self.paths.push(path);
				self._prev = path;
				self._currentPoint = [x, y];
				return self;
			},
			bezierThrough: function() {
				// ported from http://www.codeproject.com/Articles/31859/Draw-a-Smooth-Curve-through-a-Set-of-2D-Points-wit
				var self = this, i, l, segments = [], seg, n,
				cp1, cp2, rhs = [], cp1XArray = [], cp1YArray = [],
				points = fixArgs(arguments);
				var getFirstControlPoints = function(rhs) {
					var n = rhs.length;
					var x = []; // Solution vector.
					var tmp = []; // Temp workspace.
					var b = 2.0;
					var i;
					x[0] = rhs[0] / b;
					for (i = 1; i < n; i++) // Decomposition and forward substitution.
					{
						tmp[i] = 1 / b;
						b = (i < n - 1 ? 4.0 : 3.5) - tmp[i];
						x[i] = (rhs[i] - x[i - 1]) / b;
					}
					for (i = 1; i < n; i++) {
						x[n - i - 1] -= tmp[n - i] * x[n - i]; // Backsubstitution.
					}
					return x;
				};
				// add first point
				points.unshift(self._currentPoint);
				l = points.length;
				n = l - 1;
				if (n < 1) {
					throw "invalid argument";
				}
				if (n === 1) {
					// Special case: Bezier curve should be a straight line.
					cp1 =  [(2 * points[0][0] + points[1][0]) / 3, (2 * points[0][1] + points[1][1]) / 3];
					cp2 =  [2 * cp1[0][0] - points[0][0], 2 * cp1[0][1] - points[0][1]];
					segments.push([points[0], cp1, cp2, points[1]]);
				} else {
					// Right hand side vector
					for (i = 1; i < n - 1; i++) {
						rhs[i] = 4 * points[i][0] + 2 * points[i+1][0];
					}
					rhs[0] = points[0][0] + 2 * points[1][0];
					rhs[n - 1] = (8 * points[n-1][0] + points[n][0]) / 2.0;
					cp1XArray = getFirstControlPoints(rhs);
					for (i = 1; i < n - 1; i++) {
						rhs[i] = 4 * points[i][1] + 2 * points[i+1][1];
					}
					rhs[0] = points[0][1] + 2 * points[1][1];
					rhs[n - 1] = (8 * points[n-1][1] + points[n][1]) / 2.0;
					cp1YArray = getFirstControlPoints(rhs);
					for (i = 0; i < n; i++) {
						cp1 = [cp1XArray[i], cp1YArray[i]];
						if (i < n - 1) {
							cp2 = [2 * points[i+1][0] - cp1XArray[i+1], 2 * points[i+1][1] - cp1YArray[i+1]];
						} else {
							cp2 = [(points[n][0] - cp1XArray[n-1]) / 2, (points[n][1] - cp1YArray[n-1]) / 2];
						}
						segments.push([points[i], cp1, cp2, points[i+1]]);
					}
				}
				// register all segments as bezier curves
				for (i = 0; i < n; i++) {
					seg = segments[i];
					self.bezierCurveTo(seg[1][0],seg[1][1],seg[2][0],seg[2][1],seg[3][0],seg[3][1], {});
				}
				self._currentPoint = points[points.length-1];
				return self;
			},
			start: function() {
				var self = this;
				return self.onStart();
			}
		};

		function QuadraticCurve(x0, y0, x1, y1, cx, cy, options) {
			this.options = options || {};
			this.x0 = x0;
			this.y0 = y0;
			this.x1 = x1;
			this.y1 = y1;
			this.cx = cx;
			this.cy = cy;
			// shortcut
			var dx0 = abs(x0-cx);
			var dx1 = abs(x1-cx);
			var dy0 = abs(y0-cy);
			var dy1 = abs(y1-cy);
			this.length =
				sqrt(dx0*dx0 + dy0*dy0) +
				sqrt(dx1*dx1 + dy1*dy1)
			;
		}
		QuadraticCurve.prototype = {
			getX: function(t) {
				var tp = 1-t;
				return t*t*this.x1 + 2*t*(1-t)*this.cx + tp*tp*this.x0;
			},
			getY: function(t) {
				var tp = 1-t;
				return t*t*this.y1 + 2*t*(1-t)*this.cy + tp*tp*this.y0;
			}
		};

		function BezierCurve(x0, y0, x1, y1, x2, y2, x3, y3, dt, options) {
			var self = this;
			self.options = options || {};
			self.dt = dt;
			self.ax = 3 * x1 + x3 - 3 * x2 - x0;
			self.bx = 3 * (x0 - 2 * x1 + x2);
			self.cx = 3 * (x1 - x0);
			self.dx = x0;
			self.ay = 3 * y1 + y3 - 3 * y2 - y0;
			self.by = 3 * (y0 - 2 * y1 + y2);
			self.cy = 3 * (y1 - y0);
			self.dy = y0;
			self._lengthCache = [];
			self.length = self._calcLength(1, self.dt);
		}
		BezierCurve.prototype = {
			getX: function(t, t2, t3) {
				t2 = t2 || t * t;
				t3 = t3 || t2 * t;
				return this.ax * t3 + this.bx * t2 + this.cx * t + this.dx;
			},
			getY: function(t, t2, t3) {
				t2 = t2 || t * t;
				t3 = t3 || t2 * t;
				return this.ay * t3 + this.by * t2 + this.cy * t + this.dy;
			},
			getDiffX: function(t, t2) {
				t2 = t2 || t * t;
				return 3 * this.ax * t2 + 2 * this.bx * t + this.cx;
			},
			getDiffY: function(t, t2) {
				t2 = t2 || t * t;
				return 3 * this.ay * t2 + 2 * this.by * t + this.cy;
			},
			_calcLength: function(t, dt) {
				// calculate length by integrating hypotenuses
				var self = this, t2 = t * t;
				var result = null;
				if (t <= 0) {
					return 0;
				}
				var diffX = this.getDiffX(t, t2);
				var diffY = this.getDiffY(t, t2);
				var diff = Math.sqrt(diffX * diffX + diffY * diffY) * dt;
				if (t <= dt) {
					result = diff;
				}
				result = diff + self._calcLength(t - dt, dt);
				self._lengthCache.push(diff);
				return result;
			},
			getInterveningVariableByRatio: function(ratio) {
				var self = this, currentLength = 0, i = 0, l = self._lengthCache.length, t = 0, offset;
				while(currentLength / self.length < ratio && i < l) {
					currentLength += self._lengthCache[i++];
				}
				// interpolate linearly in interval region
				offset = (currentLength - self.length * ratio) / self._lengthCache[i-1];
				t = (i - offset) / l;
				return t;
			}
		};

		return {
			init: function(options) {
				var self = this;
				self.currentFrame = 0;
				self.tweens = {};
				/*
				self._tweenDictionary = {};
				self._tweenDictionaryNum = 0;
				self._targetList = [];
				*/
				self.options = options || {};
			},
			register: function(tween) {
				var self = this;
				defaults(tween.options, self.options);
				tween.prepare();
				tween.startFrame = self.currentFrame + tween.delay;
				tween.player = self;
				var id = tween.id;
				self.tweens[id] = tween;
			},
			cancel: function(target, tweenId) {
				var self = this;
				var tweens = self.tweens;
				for (var id in tweens) {
					var tween = tweens[id];
					if (tween && tween.target === target && (!tweenId || tweenId === tween.id)) {
						tween.release = true;
					}
				}
				return self;
			},
			proceed: function() {
				var self = this;
				var id, tween, tweens = self.tweens;
				var count = 0;
				var currentFrame = self.currentFrame++;
				for (id in tweens) {
					tween = tweens[id];
					if (tween.release) {
						delete tweens[id];
					} else {
						tween.update(currentFrame);
						count++;
					}
				}
				self.count = count;
			},
			to: function(target, duration, vars, options) {
				var self = this;
				options = options || {};
				var tween = new Tween(target, duration, vars, options);
				if (!options.future) {
					self.register(tween);
				}
				return tween;
			},
			from: function(target, duration, vars, options) {
				var self = this;
				options = options || {};
				options.runBackwards = true;
				var tween = new Tween(target, duration, vars, options);
				self.register(tween);
				return tween;
			},
			path: function(target, duration, options) {
				var self = this, path = new Path();
				options = options || {};
				path.init(defaults(self.options, options));
				path.moveTo(target.x, target.y);
				path._currentPoint = [target.x, target.y];
				options.path = path;
				path.onStart = function() {
					if (path.paths.length <= 1) {
						return null;
					}
					var tween = new Tween(target, duration, {}, options);
					self.register(tween);
					return tween;
				};
				return path;
			}
		};
	});

	/*
		Disclaimer for Robert Penner's Easing Equations license:
		TERMS OF USE - EASING EQUATIONS
		Open source under the BSD License.
		Copyright © 2001 Robert Penner
		All rights reserved.
	 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

	 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
	 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
	 * Neither the name of the author nor the names of contributors may be used to endorse or promote products derived from this software without specific prior written permission.

		THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */
	/**
	 * t - timing
	 * b - beginniung value
	 * c - change needed in value
	 * d - expected duration
	 */
	var easing = {
		back: {
			easeIn: function(t, b, c, d, s) {
				if (s === undefined) s = 1.70158;
				return c*(t/=d)*t*((s+1)*t - s) + b;
			},
			easeOut: function(t, b, c, d, s) {
				if (s === undefined) s = 1.70158;
				return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
			},
			easeInOut: function(t, b, c, d, s) {
				if (s === undefined) s = 1.70158;
				t = t / d / 2;
				if (t < 1) {
					return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
				}
				return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
			}
		},
		bounce: {
			easeIn: function(t, b, c, d) {
				return c - easing.bounce.easeOut(d-t, 0, c, d) + b;
			},
			easeOut:  function(t, b, c, d) {
				if ((t/=d) < (1/2.75)) {
					return c*(7.5625*t*t) + b;
				} else if (t < (2/2.75)) {
					return c*(7.5625*(t-=(1.5/2.75))*t + 0.75) + b;
				} else if (t < (2.5/2.75)) {
					return c*(7.5625*(t-=(2.25/2.75))*t + 0.9375) + b;
				} else {
					return c*(7.5625*(t-=(2.625/2.75))*t + 0.984375) + b;
				}
			},
			easeInOut: function(t, b, c, d) {
				if (t < d/2) return easing.bounce.easeIn(0, c, d)(t * 2) * 0.5 + b;
				else return easing.bounce.easeOut(0, c, d)(t * 2 - d) * 0.5 + c*0.5 + b;
			}
		},
		circ: {
			easeIn:function(t, b, c, d) {
				return -c * (sqrt(1 - (t/=d)*t) - 1) + b;
			},
			easeOut: function(t, b, c, d) {
				return c * sqrt(1 - (t=t/d-1)*t) + b;
			},
			easeInOut: function(t, b, c, d) {
				t = t / d / 2;
				if (t < 1) return -c/2 * (sqrt(1 - t*t) - 1) + b;
				return c/2 * (sqrt(1 - (t-=2)*t) + 1) + b;
			}
		},
		cubic: {
			easeIn: function(t, b, c, d) {
				return c*(t/=d)*t*t + b;
			},
			easeOut:  function(t, b, c, d) {
				return c*((t=t/d-1)*t*t + 1) + b;
			},
			easeInOut: function(t, b, c, d) {
				t = t / d / 2;
				if (t < 1) return c/2*t*t*t + b;
				return c/2*((t-=2)*t*t + 2) + b;
			}
		},
		elastic: {
			easeIn: function(t, b, c, d, a, p) {
				var s;
				if (t===0) return b;
				if ((t/=d)===1) return b+c;
				if (!p) p=d*0.3;
				if (!a || a < abs(c)) { a=c; s=p/4; }
				else s = p/(2*PI) * asin (c/a);
				return -(a*pow(2,10*(t-=1)) * sin( (t*d-s)*(2*PI)/p )) + b;
			},
			easeOut: function(t, b, c, d, a, p) {
				var s;
				if (t===0) return b;
				if ((t /= d)===1) return b+c;
				if (!p) p=d*0.3;
				if (!a || a < abs(c)) { a=c; s=p/4; }
				else s = p/(2*PI) * asin (c/a);
				return (a*pow(2,-10*t) * sin( (t*d-s)*(2*PI)/p ) + c + b);
			},
			easeInOut:function(t, b, c, d, a, p) {
				if (t===0) return b;
				t = t / d / 2;
				var s;
				if (t===2) return b+c;
				if (!p) p=d*(0.3*1.5);
				if (!a || a < abs(c)) { a=c; s=p/4; }
				else s = p/(2*PI) * asin (c/a);
				if (t < 1) return -0.5*(a * pow(2,10*(t-=1)) * sin( (t*d-s)*(2*PI)/p )) + b;
				return a*pow(2,-10*(t-=1)) * sin( (t*d-s)*(2*PI)/p )*0.5 + c + b;
			}
		},
		expo: {
			easeIn: function(t, b, c, d) {
				return (t===0) ? b : c * pow(2, 10 * (t/d - 1)) + b;
			},
			easeOut: function(t, b, c, d) {
				return (t===d) ? b+c : c * (-pow(2, -10 * t/d) + 1) + b;
			},
			easeInOut: function(t, b, c, d) {
				if (t===0) return b;
				if (t===d) return b+c;
				t = t / d / 2;
				if (t < 1) return c/2 * pow(2, 10 * (t - 1)) + b;
				return c/2 * (-pow(2, -10 * --t) + 2) + b;
			}
		},
		linear: {
			none: function(t, b, c, d) {
				return c*t/d + b;
			},
			easeIn: function(t, b, c, d) {
				return c*t/d + b;
			},
			easeOut: function(t, b, c, d) {
				return c*t/d + b;
			},
			easeInOut:function(t, b, c, d) {
				return c*t/d + b;
			}
		},
		quad: {
			easeIn: function(t, b, c, d) {
				return c*(t/=d)*t + b;
			},
			easeOut: function(t, b, c, d) {
				return -c *(t/=d)*(t-2) + b;
			},
			easeInOut: function(t, b, c, d) {
				t /= d/2;
				if (t < 1) {
					return c/2*t*t + b;
				}
				return -c/2 * ((--t)*(t-2) - 1) + b;
			}
		},
		quart: {
			easeIn: function(t, b, c, d) {
				return c*(t/=d)*t*t*t + b;
			},
			easeOut: function(t, b, c, d) {
				return -c * ((t=t/d-1)*t*t*t - 1) + b;
			},
			easeInOut: function(t, b, c, d) {
				t /= d/2;
				if (t < 1) {
					return c/2*t*t*t*t + b;
				}
				return -c/2 * ((t-=2)*t*t*t - 2) + b;
			}
		},
		quint: {
			easeIn: function(t, b, c, d) {
				return c*(t/=d)*t*t*t*t + b;
			},
			easeOut:function(t, b, c, d) {
				return c*((t=t/d-1)*t*t*t*t + 1) + b;
			},
			easeInOut: function(t, b, c, d) {
				t /= d/2;
				if (t < 1) {
					return c/2*t*t*t*t*t + b;
				}
				return c/2*((t-=2)*t*t*t*t + 2) + b;
			}
		},
		sine: {
			easeIn: function(t, b, c, d) {
				return -c * cos(t/d * (PI/2)) + c + b;
			},
			easeOut: function(t, b, c, d) {
				return c * sin(t/d * (PI/2)) + b;
			},
			easeInOut: function(t, b, c, d) {
				return -c/2 * (cos(PI*t/d) - 1) + b;
			}
		}
	};

	/**
	 * Color
	 */
	var color = (function() {

		function fix(c) {
			if (c) {
				if (c.length === 0) {
					return '00';
				} else if (c.length === 1) {
					return '0' + c;
				} else {
					return c;
				}
			} else {
				return '00';
			}
		}

		function Color() {
		}
		Color.prototype = {
			init: function() {
				var args = Array.prototype.slice.apply(arguments);
				if (args.length >= 3) {
					this.c = [
						Number(args[0]),
						Number(args[1]),
						Number(args[2]),
						(args.length === 3) ? 1 : Number(args[3])
					];
				} else if (args.length === 1) {
					var text = args[0];
					if (text.charAt(0) === '#') {
						text = text.substring(1);
					}
					var r = '00';
					var g = '00';
					var b = '00';
					if (text.length === 3) {
						r = text.charAt(0);
						g = text.charAt(1);
						b = text.charAt(2);
						r += r;
						g += g;
						b += b;
					} else if (text.length === 6) {
						r = text.substring(0, 2);
						g = text.substring(2, 4);
						b = text.substring(4, 6);
					}
					this.c = [
						parseInt('0x'+r, 16),
						parseInt('0x'+g, 16),
						parseInt('0x'+b, 16)
					];
				} else {
					this.c = [0,0,0,1];
				}
			},
			fix: function() {
				var c = this.c;
				for (var i = 0; i < 3; i++) {
					c[i] = Math.max(0, Math.min(255, round(c[i])));
				}
				return this;
			},
			add: function(r, g, b) {
				var c = this.c;
				if (r) {
					c[0] += r;
				}
				if (g) {
					c[1] += g;
				}
				if (b) {
					c[2] += b;
				}
				return this.fix();
			},
			clone: function() {
				var clone = new Color();
				clone.c = this.c.concat();
				return clone;
			},
			hex: function() {
				var c = this.c;
				return '#' +
				fix(c[0].toString(16)) +
				fix(c[1].toString(16)) +
				fix(c[2].toString(16));
			},
			rgb: function() {
				var c = this.c;
				return 'rgb('+c[0]+','+c[1]+','+c[2]+')';
			},
			rgba: function() {
				var c = this.c;
				return 'rgba('+c[0]+','+c[1]+','+c[2]+','+c[3]+')';
			},
			hsv: function() {
				var c = this.c;
				var r = c[0] / 255;
				var g = c[1] / 255;
				var b = c[2] / 255;
				var mx = max(r, g, b);
				var mn = min(r, g, b);
				var d = (mx - mn);
				var h = 0, s = 0;
				var v = mx;
				if (mx === 0) {
					s = 0;
					h = -1;
				} else {
					s = d /  mx;

					if (r === mx) {
						h = (g - b) / d;
					} else if (g === mx) {
						h = 2 + (b - r) / d;
					} else {
						h = 4 + (r - g) / d;
					}
				}
				h *= 60;
				while (h < 0) {
					h += 360;
				}
				return {
					h: h,
					s: s,
					v: v,
					color: function() {
						var h = this.h;
						var s = this.s;
						var v = this.v;
						var r = v;
						var g = v;
						var b = v;
						if (s !== 0) {
							h /= 60;
							var hi = floor(h);
							var f = h - hi;
							var p = v * (1 - s);
							var q = v * (1 - s * f);
							var t = v * (1 - s * (1 - f));
							if (hi === 0) {
								r = v;
								g = t;
								b = p;
							} else if (hi === 1) {
								r = q;
								g = v;
								b = p;
							} else if (hi === 2) {
								r = p;
								g = v;
								b = t;
							} else if (hi === 3) {
								r = p;
								g = q;
								b = v;
							} else if (hi === 4) {
								r = t;
								g = p;
								b = v;
							} else {
								r = v;
								g = p;
								b = q;
							}
						}
						var color = new Color();
						color.c = [r*255, g*255, b*255];
						return color.fix();
					}
				};
			},
			brightness: function(brightness) {
				var hsv = this.hsv();
				hsv.v += brightness;
				return hsv.color();
			}
		};
		function color() {
			var c = new Color();
			c.init.apply(c, arguments);
			return c;
		}
		return color;
	})();

	// freeing resources
	function free(target) {
		if (target.image) {
			// release image
			// release image sometimes destroy
			// persisted image.
			delete target.image;
		} else {
			// release other resources
			if ('getContext' in target) {
				// canvas
				target.width = 0;
				target.height = 0;
				if (WATCH_CANVAS) {
					if (target.id) {
						delete CANVAS_MAP[target.id];
					}
				}
			}
		}
	}

	/**
	 * extend base class
	 */
	function extend(parent, base, getter) {
		// create base prototype
		var superproto = parent.prototype;
		// apply super prototype
		var thisproto = getter();
		thisproto.__super__ = superproto;
		if (superproto.__props__ && !thisproto.__props__) {
			thisproto.__props__ = {};
		}
		// create this prototype
		for (var name in superproto) {
			if (!(name in thisproto)) {
				// check getter/setter properties
				if (superproto.__props__ && superproto.__props__[name]) {
					// copy setter/getter
					var define = superproto.__props__[name];
					Object.defineProperty(thisproto, name, superproto.__props__[name]);
					thisproto.__props__[name] = define;
				} else {
					// normal function
					thisproto[name] = superproto[name];
				}
			}
		}
		// overwrap init function
		var init = thisproto.init;
		if (init) {
			thisproto.init = function() {
				var self = this;
				if (WATCH_TRACE) {
					var stack = new Error().stack;
					if (stack) {
						stack = stack.split('\n');
						var skip = 2;
						for (var i = skip; i < stack.length; i++) {
							var line = stack[i] = stack[i].replace(/\s+at\s+/,'');
							// omit thisproto function
							if (line.indexOf('Object.thisproto.init') === 0) {
								skip++;
							}
						}
						self._stack_ = stack.splice(skip);
					}
				}
				parent.prototype.init.apply(self, arguments);
				init.apply(self, arguments);
				return self;
			};
		}
		base.prototype = thisproto;
		return base;
	}

	// create a stage
	function createStage(options) {
		return new Stage().init(options);
	}

	// create a sprite
	function createSprite(options) {
		return new Sprite().init(options);
	}

	// create a graphics
	function createGraphics(options) {
		return new Graphics().init(options);
	}

	// create a bitmap
	function createBitmap(options) {
		return new Bitmap().init(options);
	}

	// create a text field
	function createTextField(options) {
		return new TextField().init(options);
	}

	// create a linked list
	function createLinkedList() {
		return new LinkedList();
	}

	// create a embedded image
	function createEmbeddedImage(options) {
		return new EmbeddedImage().init(options);
	}

	// create a sprite sheet
	function createSpriteSheet(options) {
		return new SpriteSheet().init(options);
	}

	// create a combined sprite
	function createCombinedSheet(options) {
		return new CombinedSheet().init(options);
	}

	// create a cutoff animation sprite sheet
	function createCutoffAnimationSheet(options) {
		return new CutoffAnimationSheet().init(options);
	}

	// create a motion player
	function createMotionPlayer(options) {
		return new MotionPlayer().init(options);
	}

	// extend Sprite
	function extendSprite(ext) {
		return extend(Sprite, function() {}, ext);
	}

	function extendBitmap(ext) {
		return extend(Bitmap, function() {}, ext);
	}

	function extendGraphics(ext) {
		return extend(Graphics, function() {}, ext);
	}

	function extendEventEmitter(ext){
		return extend(EventEmitter, function() {}, ext);
	}

	/**
	 * place json definition to canvas context
	 */
	function place(places, option) {
		return new TofuPlacer(places, option).place();
	}

	// release image immediately with setting empty image to the src
	function releaseImage(img) {
		img.src = emptyImageUrl;
	}

	function imageUrl(url) {
		url = url.replace('${ratio}', pixelRatio * 10);
		return url;
	}

	function init(clz, option) {
		return new clz().init(option);
	}

	function createTweenPlayer(option) {
		var player = new TweenPlayer();
		player.init(option);
		return player;
	}

	function adjustText(context, text, maxWidth, maxHeight, lineHeight) {
		var lines = [];
		var line = '';
		var next;
		var totalHeight = 0;
		var actualWidth = 0;
		for (var i = 0; i < text.length; i++) {
			var charcter = text.charAt(i);
			next = line + charcter;
			var mwidth = context.measureText(next).width;
			if (mwidth > maxWidth || charcter === '\n') {
				lines.push(line);
				line = charcter;
				if (charcter === '\n') line = "";
				// check max height
				if (maxHeight && (totalHeight + lineHeight > maxHeight)) {
					// if next height will exceeds, add ... and break
					// TODO implement
					line += '';
				}
			} else {
				line = next;
				if (actualWidth < mwidth) {
					actualWidth = mwidth;
				}
			}
		}
		if (line.length > 0) {
			totalHeight += lineHeight;
			lines.push(line);
		}
		return {
			lines: lines,
			width: actualWidth
		};
	}

	function drawText(option) {

		var str = option.text || "";
		var context = option.context;
		var width = option.width || 100;
		var height = option.height || 20;
		var lineHeight = option.lineHeight || 1.2;
		var border = option.border || false;
		var baseline = option.baseline || "";
		var shadow = option.shadow;
		var x = option.x || 0;
		var y = option.y || 0;

		if (option.textAlign) {
			context.textAlign = option.textAlign;
		}
		if (option.font){
			context.font = option.font;
		}

		if (option.fillStyle) {
			context.fillStyle = option.fillStyle;
		}
		if (option.line) {
			context.lineWidth = option.line.width || 1;
			context.strokeStyle = option.line.color || '#f000';
		}

		// font size
		var fontSize = 10;
		if (context.font.match(/([0-9\.]+)px/)) {
			fontSize = Number(RegExp.$1);
		}

		// lineheight
		var lineHeightPx = (fontSize * lineHeight);
		var stackHeight = fontSize;
		var maxLine = Math.floor(height / lineHeightPx);

		//split column
		var columns = [];
		var line = '';

		var i = 0, slen = str.length;

		for (i=0; i < slen; ++i) {

			var char = str.charAt(i);
			if (char === '\n'){
				stackHeight += lineHeightPx;
				columns.push(line);
				line = '';
				if (columns.length >= maxLine) {
					break;
				}
			}

			// add enter to the last when overflow of the width.
			if (context.measureText(line + char).width > width) {
				// start new line
				stackHeight += lineHeightPx;
				// max height
				if (columns.length === maxLine - 1) {
					// add horizontal ellipsis to the last line.
					line = line.substring(0, line.length-1);
					while (context.measureText(line + '\u2026').width >= width) {
						line = line.substring(0, line.length-1);
						if (line.length === 0) {
							break;
						}
					}
					line += '\u2026';
				}
				columns.push(line);
				line = '';
				if (columns.length >= maxLine) {
					break;
				}
			}
			line += char;
		}
		if (line.length > 0) {
			columns.push(line);
		}

		var len = columns.length;
		//align
		var adjustX = 0;
		var adjustY = 0;
		switch (context.textAlign) {
		case "center":
			adjustX = width/2;
			break;
		case "right":
			adjustX = width;
			break;
		}
		switch (baseline){
		case "middle":
			adjustY = (height - stackHeight)/2;
			break;
		case "bottom":
			adjustY = (height - stackHeight);
			break;
		}

		var line = option.line;

		//draw
		for (i=0; i < len; ++i) {
			var _x = floor(adjustX + x);
			var _y = floor(adjustY + y + i * lineHeightPx + fontSize);
			var column = columns[i];
			if (shadow) {
				var prevStyle = context.fillStyle;
				shadow = (shadow === true) ? 'rgba(0,0,0,0.4)' : shadow;
				if (line) {
					context.lineWith = line.width || 1;
					context.strokeStyle = line.color || '#000';
					context.strokeText(column,_x,_y + 1);
				}
				context.fillStyle = shadow || 'rgba(0,0,0,0.4)';
				context.fillText(column,_x, _y + 1);
				context.fillStyle = prevStyle;
			}

			if (line) {
				context.strokeText(column, _x, _y);
			}
			context.fillText(column, _x, _y);

			stackHeight += lineHeightPx;
		}
		if (border) {
			context.strokeRect(x,y,width,height);
		}
	}

	// enable HTML mode
	// should be called before initialize stage.
	function htmlMode() {
		HTML_MODE = true;
		CANVAS_MODE = false;
		htmlRatio = 1;
		tofu.htmlRatio = 1;
	}

	var tofu = {
		createStage: createStage,
		createSprite: createSprite,
		createGraphics: createGraphics,
		createTextField: createTextField,
		createBitmap: createBitmap,
		createEmbeddedImage: createEmbeddedImage,
		createSpriteSheet: createSpriteSheet,
		createCombinedSheet: createCombinedSheet,
		createCutoffAnimationSheet: createCutoffAnimationSheet,
		createMotionPlayer: createMotionPlayer,
		createContext: createContext,
		extendSprite: extendSprite,
		extendGraphics: extendGraphics,
		extendBitmap: extendBitmap,
		extendEventEmitter: extendEventEmitter,
		pixelRatio: pixelRatio,
		htmlRatio: htmlRatio,
		imageUrl: imageUrl,
		tween: createTweenPlayer,
		easing: easing,
		init: init,
		free: free,
		place: place,
		color: color,
		drawText: drawText,
		drawImage: drawImage,
		adjustText: adjustText,
		extend: extend,

		// direct reference to function
		// these constructors needs to be called init() before using.
		Stage: Stage,
		EventEmitter: EventEmitter,
		DisplayObject: DisplayObject,
		Graphics: Graphics,
		TextField: TextField,
		Bitmap: Bitmap,
		SpriteBitmap: SpriteBitmap,
		EmbeddedImage: EmbeddedImage,
		SpriteSheet: SpriteSheet,
		Sprite: Sprite,
		MotionPlayer: MotionPlayer,

		// enable html mode
		htmlMode: htmlMode
	};

	if (typeof define === 'function' && define.amd) {
		define([], function() {
			return tofu;
		});
	} else {
		w.tofu = tofu;
	}

})(window);
