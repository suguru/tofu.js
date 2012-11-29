
/**
 * toufu.js is the light-weight sprite library
 * which draw sprite images to html5 canvas
 */

(function(w) {

	var doc = document;
	var pixelRatio = window.devicePixelRatio || 1;
	var reverseRatio = 1 / pixelRatio;

	var STROKE_DRAW_REGION = 0;

	// create the html element
	function createElement(elementType) {
		return doc.createElement(elementType)
	}

	// create the canvas element
	function createCanvas(width,height) {
		var canvas = createElement('canvas');
		if (width && height) {
			canvas.width = width;
			canvas.height= height;
		}
		return canvas;
	}

	// get the 2d context of the canvas
	function getContext(canvas) {
		return canvas.getContext('2d');
	}

	// create the fragment element
	function createFragment() {
		return doc.createDocumentFragment();
	}

	// select element by css selector
	function select(query) {
		return doc.querySelector(query);
	}

	// select all elements by css selector
	function selectAll(query) {
		return doc.querySelectorAll(query);
	}

	// return true if value is undefined
	function isUndefined(value) {
		return value === undefined;
	}

	// return ratio converted value
	function ratio(value) {
		if (pixelRatio === 1) {
			return value;
		} else {
			return floor(value * pixelRatio);
		}
	}

	// convert arguments to array
	function fixArgs(args) {
		return Array.prototype.slice.apply(args);
	}

	function binder(source) {
		return {
			on: function(name, listener) {
				source.addEventListener(name, listener);
				return this;
			}
		};
	}

	var Stopwatch = {
		time: 0,
		start: function() {
			Stopwatch.time = Date.now();
		},
		stop: function() {
			var elapsed = Date.now() - Stopwatch.time;
			$('#debug').text(elapsed + ' msec');
		}
	};

	// Math short-cuts
	var abs = Math.abs;
	var floor = Math.floor;
	var ceil = Math.ceil;
	var round = Math.round;
	var max = Math.max;
	var min = Math.min;
	var mathsin = Math.sin;
	var mathcos = Math.cos;
	var PI = Math.PI;
	var PI_DOUBLE = PI*2;

	// Shortcut
	var fromCharCode = String.fromCharCode;
	var isArray = Array.isArray;

	var now = null;
	if ('now' in Date) {
		now = Date.now;
	} else {
		now = function now() {
			return new Date().getTime();
		}
	}

	var EventEmitter = (function EventEmitter() {
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
			},
			// unregister event handlers
			off: function(name, handler) {
				var self = this;
				var handlers = self.listeners[name];
				if (handlers) {
					if (handler) {
						// clear specific handler
						var index = handlers.indexOf(handler);
						if (index >= 0) {
							handlers.splice(index,1);
						}
					} else {
						// delete all handlers
						delete self.listeners[name];
					}
				}
			},
			// trigger handlers which registered the event
			emit: function(name,event) {
				var self = this;
				// get handlers
				var handlers = self.listeners[name];
				if (handlers) {
					// call all handlers
					var length = handlers.length;
					for (var i = 0; i < length; i++) {
						handlers[i].call(self, event);
					}
				}
			}
		};
		return EventEmitter;
	})();

	var LinkedList = (function LinkedList() {
		function LinkedList() {
			var self = this;
			self.head = null;
			self.tail = null;
		}
		LinkedList.prototype = {
			// add object to the tail
			push: function(o) {
				var self = this;
				if (self.tail) {
					var prev = self.tail;
					var node = [prev,o,null];
					prev[2] = node;
					o._node = node;
					self.tail = node;
				} else {
					var node = [null,o,null];
					self.head = node;
					self.tail = node;
				}
			},
			pop: function() {
			},
			// insert object to the head
			unshift: function(o) {
				var self = this;
				if (self.head) {
					var next = self.head;
					var node = [null,o,next];
					next[0] = o;
					o._node = node;
					self.head = node;
				} else {
					var node = [null,o,null];
					self.head = node;
					self.tail = node;
				}
			},
			shift: function() {
			},
			// remove object
			remove: function(o) {
				var self = this;
				var node = o._node;
				if (node) {
					var prev = node[0];
					var curr = node[1];
					var next = node[2];
					if (curr === self.head) {
						// if head is removed, choose next as head
						self.head = curr[2];
					}
					if (curr === self.tail) {
						// if tail is removed, choose previous as head
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
				while (node) {
					// call handler
					handler.apply(node[1]);
					// pick next
					node = node[2];
				}
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
		// matrix array
		// [a,b,c,d,tx,ty] = [0,1,2,3,4,5]
		rotate: function(array, angle) {
			var cos = mathcos(angle);
			var sin = mathsin(angle);
			var a = array[0];
			var b = array[1];
			var c = array[2];
			var d = array[3];
			var tx = array[4];
			var ty = array[5];
			array[0] = a * cos - b * sin;
			array[1] = b * cos + a * sin;
			array[2] = c * cos - d * sin;
			array[3] = d * cos + c * sin;
			array[4] = tx * cos - ty * sin;
			array[5] = ty * cos + tx * sin;
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
		// set array as identity matrix
		identify: function(array) {
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

			// return default rectangle
			if (a === 1 && b === 0 && c === 0 && d === 1 && tx === 0 && ty === 0) {
				return rect;
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
			var x1 = x1a * y1c + tx;
			var y1 = x1b * y1d + ty;
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
		merge: function(rects) {

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
		return {
			init: function(options) {
				options = options || {};
				var self = this;
				var width = self.width = options.width || 100;
				var height = self.height = options.height || 100;

				var canvas = createCanvas(ceil(width*pixelRatio), ceil(height*pixelRatio));
				// set canvas region
				canvas.style.width = width + 'px';
				canvas.style.height = height + 'px';

				var context = getContext(canvas);
				var frameRate = options.frameRate || 20;

				self.canvas = canvas;
				self.context = context;
				self.frameRate = frameRate;
				self.frameWait = ceil(1000 / self.frameRate);
				self.list = createLinkedList();
				self.redraws = [];

				setTimeout(function() {
					self.frame(now());
				}, 0);
			},
			show: function(selector) {
				var self = this;
				var element = select(selector);
				if (element) {
					element.appendChild(self.canvas);
				}
			},
			// add object to the stage
			add: function() {
				var self = this;
				var args = fixArgs(arguments);
				for (var i = 0; i < args.length; i++) {
					var object = args[i];
					if (object._stage) {
						object._stage.remove(object);
					}
					self.list.push(object);
					object._stage = self;
				}
			},
			// remove object from the stage
			remove: function() {
				var self = this;
				var args = fixArgs(arguments);
				for (var i = 0; i < args.length; i++) {
					var object = args[i];
					self.list.remove(object);
					self.redraws.push(object.region);
					object._stage = null;
				}
			},
			// frame handler
			frame: function(next) {
				var self = this;
				var start = now();
				var context = self.context;
				// skip rendering if wait time is negative
				if (start < next) {
					var list = self.list;
					var node = list.head;
					var updates = [];
					var redraws = self.redraws;
					// collect updated regions
					node = list.head;
					var curr;
					while (node) {
						curr = node[1];
						curr._redraw(redraws);
						node = node[2];
					}
					// merge regions
					redraws = Rectangle.merge(redraws);
					// clearing updated region
					length = redraws.length;
					for (i = 0; i < length; i++) {
						var redraw = redraws[i];
						if (redraw !== null) {
							context.clearRect.apply(context,redraw);
						}
					}
					// redraw from head (deepest first)
					node = list.head;
					while (node) {
						curr = node[1];
						curr._render(context, redraws);
						node = node[2];
					}
					self.redraws = [];
				}
				var end = now();
				var wait = next - end;
				if (wait < 0) {
					self.cpu = 100;
				} else {
					self.cpu = Math.floor(((self.frameWait - wait) / self.frameWait) * 100);
				}
				self.timerId = setTimeout(function() {
					// assign next frame handler
					self.emit('enterframe');
					self.frame(now() + self.frameWait);
					self.emit('exitframe');
				}, wait > 0 ? wait : 0); 
			}
		};
	});

	/**
	 * base object
	 */
	var DisplayObject = extend(EventEmitter, function DisplayObject() {}, function() {
		var globalId = 0;
		return {
			init: function(options) {
				options = options || {};
				var self = this;
				self.id = ++globalId;
				self.x = 'x' in options ? options.x : 0;
				self.y = 'y' in options ? options.y : 0;
				self.scaleX = 'scaleX' in options ? options.scaleX : 1;
				self.scaleY = 'scaleY' in options ? options.scaleY : 1;
				self.baseX = 'baseX' in options ? options.baseX : 0;
				self.baseY = 'baseY' in options ? options.baseY : 0;
				self.angle = 'angle' in options ? options.angle : 0;
				self.matrix = [1,0,0,1,0,0]; // transformation matrix
				self.region = [0,0,0,0]; // maximum region of the object
				self.width = self.height = 0;
				self.parent = null;
				self.list = null;
				self.previous = {
					region: null,
					matrix: null
				};
				self.flags = {
					child: false,
					update: false,
					draw: false
				};
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
			// collect redraw regions
			_redraw: function(redraws) {
				var self = this;
				var flags = self.flags;
				var list = self.list;
				if (flags.update) {
					self.calculate();
					var prev = self.previous;
					var region1 = prev.region;
					var region2 = self.region;
					var m1 = prev.matrix;
					var m2 = self.matrix;
					prev.region = self.region;
					prev.matrix = self.matrix;
					if (region1) {
						var intersect = Rectangle.intersect(region1, region2, 1);
						if (intersect) {
							// add merged region
							if (intersect[2] > 0 && intersect[3] > 0) {
								redraws.push(intersect);
							}
						} else {
							// add separated region
							if (region1[2] > 0 && region1[3] > 0) {
								redraws.push(region1);
							}
							if (region2[2] > 0 && region2[3] > 0) {
								redraws.push(region2);
							}
						}
					} else if (region2[2] > 0 && region2[3] > 0) {
						// add curent region only (first time)
						redraws.push(region2);
					}
					// if rotated, scaled or specified
					// redraw internal canvas
					if (flags.draw ||
							m1 == null ||
							m1[0] !== m2[0] ||
							m1[1] !== m2[1] ||
							m1[2] !== m2[2] ||
							m1[3] !== m2[3]) {
						self.draw();
						flags.draw = false;
					}
					// redraw children
					if (list) {
						var node = list.head;
						while (node) {
							var curr = node[1];
							curr.flags.update = true;
							curr._redraw(redraws);
							node = node[2];
						}
					}
				} else if (flags.child && list) {
					var node = list.head;
					while (node) {
						var curr = node[1];
						var cflags = curr.flags;
						// check before call
						if (cflags.update || cflags.child) {
							// push all elements
							curr._redraw(redraws);
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
			_render: function(context,regions) {
				var self = this;
				//if (self.flags.update) {
				if (self.flags.update) {
					// render whole area if marked as update
					self.render(context);
					self.flags.update = false;
					if (STROKE_DRAW_REGION) {
						context.save();
						context.strokeStyle = 'rgb(180,0,0)';
						context.lineWidth = 1;
						context.strokeRect.apply(context, self.region);
						context.restore();
					}
				} else {
					// render area which are intersected with regions
					var region = self.region;
					var i, j;
					var intersects = [];
					var length = regions.length;
					// get all intersected region
					for (var i = 0; i < length; i++) {
						var other = regions[i];
						if (other) {
							var intersect = Rectangle.intersect(region,other);
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
					}
				}
				var list = self.list;
				if (list) {
					var node = list.head;
					var curr;
					while (node) {
						curr = node[1];
						curr._render(context,regions);
						node = node[2];
					}
				}
			},
			// render object
			render: function(context,regions) {
			},
			// calculate matrix and bounds
			calculate: function() {
				var self = this;
				var parent = self.parent;

				// normalize angle
				var angle = self.angle;
				if (angle > PI_DOUBLE || angle < -PI_DOUBLE) {
					angle = angle % PI_DOUBLE;
				}
				if (angle < 0) {
					angle += PI_DOUBLE;
				}
				self.angle = angle;

				// calculate matrix
				// prepare matrix
				var matrix = self.matrix = [1,0,0,1,0,0];
				// translate for base X, Y
				if (self.baseX !== 0 || self.baseY !== 0) {
					Matrix.translate(matrix, ratio(-self.baseX), ratio(-self.baseY));
				}
				// rotation
				if (angle > 0) {
					Matrix.rotate(matrix, angle);
				}
				// scaling
				if (self.scaleX !== 1 || self.scaleY !== 1) {
					Matrix.scale(matrix, self.scaleX, self.scaleY);
				}
				// translating
				if (!self.specifiedMatrix && (self.x !== 0 || self.y !== 0)) {
					Matrix.translate(matrix, ratio(self.x), ratio(self.y));
				}
				if (self.specifiedMatrix) {
					Matrix.concat(matrix, matrix, self.specifiedMatrix);
				}
				// concatnate
				if (parent) {
					Matrix.concat(matrix, matrix, parent.matrix);
				}
				var source = self.source;
				if (source) {
					// calculate region
					var region = Matrix.region(matrix, [0, 0, source.width, source.height]);
					self.region = region;
				}
			},
			// rotate
			rotate: function(angle) {
				var self = this;
				self.angle += angle;
				return self;
			},
			// translate
			translate: function(tx, ty) {
				var self = this;
				self.x += tx;
				self.y += ty;
				return self;
			},
			// scale
			scale: function(sx, sy) {
				var self = this;
				self.scaleX = sx;
				self.scaleY = sy === undefined ? sx : sy;
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
			// add object to sprite
			add: function() {
				var self = this;
				var args = fixArgs(arguments);
				for (var i = 0; i < args.length; i++) {
					var object = args[i];
					if (object.parent === null) {
						object.parent = self;
					} else {
						object.parent.remove(object);
					}
					if (self.list === null) {
						self.list = createLinkedList();
					}
					self.list.push(object);
					object.parent = self;
					object.update();
				}
				return self;
			},
			// remove object from sprite
			remove: function() {
				var self = this;
				var stage = self.stage();
				var args = fixArgs(arguments);
				// remove self if arguments not found
				if (args.length === 0) {
					args = [self];
				}
				for (var i = 0; i < args.length; i++) {
					var object = args[i];
					var parent = object.parent;
					if (object.parent) {
						parent.list.remove(object);
						// add removed region to redraw list
						if (stage) {
							stage.redraws.push(object.region);
						}
						object.parent = null;
					}
				}
				return self;
			}
		};
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
			initSource: function(source) {
				var args = fixArgs(arguments);
				var self = this;
				if (args.length === 2) {
					// create canvas
					var canvas = createCanvas(
						args[0], args[1]
					);
					self.source = canvas;
					return canvas;
				} else if (args.length === 1) {
					// set souce directlly
					self.source = source;
					return self;
				} else {
					// return set source
					return self.source;
				}
			},
			draw: function() {
				// return if source is not defined
				var self = this;
				var source = self.source;
				var canvas = self.canvas;
				var context = self.context;
				var region = self.region;
				if (!source) {
					return;
				}
				if (region[2] <= 0 || region[3] <= 0) {
					// ignore 0 width,height region
					return;
				}
				if (!canvas) {
					canvas = self.canvas = createCanvas(region[2],region[3]);
					context = self.context = canvas.getContext('2d');
				} else {
					canvas.width = region[2];
					canvas.height = region[3];
				}
				// apply matrix
				context.save();
				context.translate(-region[0], -region[1]);
				context.transform.apply(context, self.matrix);
				// move to region top/right
				if (source.image) {
					context.drawImage(source.image,
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
					context.drawImage(source,0,0);
				}
				context.restore();
			},
			render: function(context, regions) {
				var self = this;
				var canvas = self.canvas;
				if (!canvas) {
					// ignore if canvas is not exist
					return;
				}
				var canvas = self.canvas;
				var pattern = self.pattern;
				var region = self.region;
				if (regions) {
					var length = regions.length;
					for (var i = 0; i < length; i++) {
						var iregion = regions[i];
						if (iregion[2] === 0 || iregion[3] === 0) {
							// ignore no area
							return;
						}
						context.drawImage(
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
					context.drawImage(canvas, region[0], region[1]);
				}
			},
		};
	});

	/**
	 * Sprite which has graphic layer
	 */
	var Graphics = extend(Sprite, function Graphics() {}, function() {
		var proto = {
			init: function(options) {
				options = options || {};
				var width = this.width = options.width || 1;
				var height = this.height = options.height || 1;
				var self = this;
				var canvas = createCanvas(
					floor(width*pixelRatio),
					floor(height*pixelRatio)
				);
				self.source = canvas;
				var context = canvas.getContext('2d');
				context.scale(pixelRatio, pixelRatio);
				self.graphics = context;

				// proxy context properties
				[
					'strokeStyle','fillStyle','lineWith','lineCap','lineJoin','miterLimit',
					'shadowColor','shadowOffsetX','shadowOffsetY','shadowBlur',
					'font','textAlign','textBaseline','globalAlpha','globalCompositeOperation'
				].forEach(function(name) {
					self.__defineSetter__(name, function(value) {
						context[name] = value;
					});
					self.__defineGetter__(name, function(value) {
						return context[name];
					});
				});


				self.__defineSetter__('fillStyle', function(fillStyle) {
					context.fillStyle = fillStyle;
				});
				self.__defineSetter__('strokeStyle', function(strokeStyle) {
					context.strokeStyle = strokeStyle;
				});
			},
			resize: function(width,height) {
				var self = this;
				this.width = width;
				this.height = height;
				width = width * pixelRatio;
				height = height * pixelRatio;
				var canvas = self.source;
				canvas.width = width;
				canvas.height = height;
			},
			fillRoundRect: function(x, y, width, height, elt, ert, erb, elb) {
				var self = this;
				elt = elt || 10;
				ert = ert || elt;
				erb = erb || elt;
				elb = elb || elt;
				var graphics = self.graphics;
				graphics.beginPath();
				graphics.moveTo(x + elt,y);
				graphics.lineTo(x+width - ert,y);
				graphics.quadraticCurveTo(x+width, y, x+width, y+ert);
				graphics.lineTo(x+width,y+height-erb);
				graphics.quadraticCurveTo(x+width, y+height, x+width-erb, y+height);
				graphics.lineTo(x+elb, y+height);
				graphics.quadraticCurveTo(x, y+height, x, y+height - elb);
				graphics.lineTo(x, elt);
				graphics.quadraticCurveTo(x, y, x+elt, y);
				graphics.fill();
			},
			fillImage: function(image, repeat, x, y, width, height) {
				var self = this;
				var graphics = self.graphics;
				graphics.save();
				graphics.scale(1/pixelRatio,1/pixelRatio);
				graphics.fillStyle = graphics.createPattern(image, repeat);
				graphics.fillRect(
					x*pixelRatio,
					y*pixelRatio,
					width*pixelRatio,
					height*pixelRatio);
				graphics.restore();
			}
		};
		// canvas proxy
		[
			'beginPath','moveTo','closePath','lineTo','quadraticCurveTo','bezierCurveTo',
			'fill','arcTo','arc','rect','stroke','clip','isPointInPath',
			'clearRect','fillRect','strokeRect','addColorStop','createLinearGradient',
			'createRadialGradient','createPattern','drawImage','fillText','strokeText',
			'measureText'
		].forEach(function(name) {
			proto[name] = function() {
				var self = this;
				var graphics = self.graphics;
				return graphics[name].apply(graphics, arguments);
			};
		});
		return proto;
	});

	/**
	 * Extend sprite which has simple image element.
	 */
	var Bitmap = extend(Sprite, function Bitmaps() {}, function() {
		return {
			init: function(options) {
				options = options || {};
				var self = this;
				Sprite.prototype.init.apply(self, arguments);
				// image url
				self.url = imageUrl(options.url);
				// image must be scaled 
				var image = new Image();
				binder(image).on('load', function() {
					self.source = image;
					self.update(true);
				});
				image.src = self.url;
				return self;
			}
		};
	});
	
	/**
	 * Data embedded image
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
				var img = createElement('img');
				binder(img)
				.on('load', function() {

					var width = img.width;
					var height = img.height;

					var canvas = createCanvas(width, height);
					var context = canvas.getContext('2d');
					context.drawImage(img,0,0);

					var data = context.getImageData(0,0,width,height).data;

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
					var numExtraLines = Math.ceil(
						(strLength + BYTES_STR_LENGTH + BYTES_SIGNATURE_LENGTH) / (width * RGB_SIZE));
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
					self.data = JSON.parse(text);
					self.canvas = canvas;
					self.prepare();
					self.emit('load');
				})
				.on('error', function(e) {
					self.emit('error',e);
				});
				img.src = imageUrl(options.url);
				self.image = img;
			},
			prepare: function() {
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
		function recursive(name, data, refs) {
			if (name && data.dest) {
				refs[name] = data;
				return;
			}
			var children = data.children || data;
			for (var cname in children) {
				var child = children[cname];
				cname = name ? name + '.' + cname : cname;
				recursive(cname, child, refs);
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
				recursive('', self.data, self.sprites);
			},
			release: function() {
				EmbeddedImage.prototype.release.apply(this);
			},
			create: function(name) {
				var self = this;
				var ref = self.sprites[name];
				if (!ref) {
					throw new Error(name + ' does not exist');
				}
				return new SpriteBitmap().init({
					sheet: self,
					data: ref
				});
			}
		};
	});

	var SpriteBitmap = extend(Sprite, function BitmapSprite() {}, function() {
		return {
			init: function(options) {
				options = options || {};
				var self = this;
				var data = options.data;
				self.source = {
					image: options.sheet.image,
					x: data.dest.x,
					y: data.dest.y,
					width: data.width,
					height: data.height
				};
				self.baseX = round(data.base.x / pixelRatio);
				self.baseY = round(data.base.y / pixelRatio);
				self.x = round(data.x / pixelRatio);
				self.y = round(data.y / pixelRatio);
				self.update(true);
			}
		};
	});

	/**
	 * extend base class
	 */
	function extend(parent, base, getter) {
		// create base prototype
		var superproto = parent.prototype;
		// apply super prototype
		var thisproto = getter();
		thisproto.__super__ = superproto;
		// create this prototype
		for (var name in superproto) {
			if (!thisproto[name]) {
				thisproto[name] = superproto[name];
			}
		}
		// overwrap init function
		var init = thisproto.init;
		if (init) {
			thisproto.init = function() {
				var self = this;
				parent.prototype.init.apply(self, arguments);
				init.apply(self, arguments);
				return self;
			};
		}
		base.prototype = thisproto;
		return base;
	}

	// extend sprite object
	function extendSprite(getter) {
		return extend(Sprite, function() {}, getter);
	};

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

	function create(cls, options) {
		return new cls().init(options);
	}

	// release image immediately with setting empty image to the src
	function releaseImage(img) {
		img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
	}

	function imageUrl(url) {
		url = url.replace('${ratio}',pixelRatio*10);
		return url;
	}

	w.tofu = {
		createStage: createStage,
		createSprite: createSprite,
		createGraphics: createGraphics,
		createBitmap: createBitmap,
		createEmbeddedImage: createEmbeddedImage,
		createSpriteSheet: createSpriteSheet,
		extendSprite: extendSprite,
		extendGraphics: extendGraphics,
		pixelRatio: pixelRatio,
		imageUrl: imageUrl
	};

})(window);
