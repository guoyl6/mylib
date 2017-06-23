/*
	
*/
+function($) {
	var states = {
		start: "start",
		end: "end",
		abort: "abort",
		running: "running",
		locked: "locked",
		waiting: "waiting",
	}
	var _activity = function(parent) {
		var deferred = $.Deferred(),
			_state = states.start,
			alive = true,
			lastState = null,
			queue = $.Callbacks("stopOnFalse"),
			self = this;

		var setState = function(state) {
			if (state in states) {
				_state = state;
			} else {
				throw "unknown state: " + state;
			}
		}, die = function() {
			alive = false;
			['abort', 'notify', 'wait', 'release', 'start', 'resolve', 'lock', 'unlock']
			.forEach(function(opr) {
				self[opr] = function() {
					console.warn('activity died');
					return self;
				}
			})
		}, addQueue = function() {
			for (var i = 0, len = arguments.length; i < len; i++) {
				var fn = arguments[i];
				queue.add(
					(function(fn) {
						var rf = function() {
							queue.remove(rf);
							return fn.apply(this, arguments);
						}
						return rf;
					})(arguments[i])
				);
			}
			return self;
		};

		deferred.progress(function(topic) {
			var args = Array.prototype.slice.call(arguments, 1);
			if (!self.pubsub.has(topic)) {
				self.du(topic, args);
			}
			self.pubsub.publishWith(self.pubsub, topic, args);
		})

		$.extend(this, {
			parent: parent || null,
			promise: deferred.promise(),
			pubsub: $.pubsub(),
			lock: function() {
				if (_state == states.running || _state == states.waiting) {
					lastState = _state;
					setState(states.locked);
				}
				return self;
			},
			unlock: function() {
				(_state == states.locked) && setState(lastState);
				return self;
			},
			
			start: function() {
				var args = arguments;
				if (_state == states.start) {
					self.pubsub.one('before', function() {
						setState(states.running);
					});
					self.pubsub.publishWith(self.pubsub, 'before', args);
				}
				return self;	
			},
			wait: function() {
				(_state == states.running)  && setState(states.waiting);
				return self;
			},

			resolve: function() {
				setState(states.end);
				deferred.resolveWith(this, arguments);
				die();
				return self;
			},
			abort: function() {
				setState(states.abort);
				deferred.rejectWith(this, arguments);
				die();
				return self;
			},
			release: function() {
				if (_state == states.waiting || _state == states.running) {
					(_state == states.waiting) && setState(states.running);
					queue.fireWith(this, arguments);
				}
				return self;
			},
			notify: function(topic) {
				var ctx = this, t = arguments;
				if (_state == states.waiting) {
					return addQueue(function() {
						return self.notify.apply(ctx, t);
					})
				} else if (_state == states.running) {
					deferred.notifyWith(ctx, t);
				}
				return self;
			},
			sink: function(child) {
				var ctx = this, t = arguments,
					args = Array.prototype.slice.call(arguments, 1);
				if (_state == states.waiting) {
					return addQueue(function() {
						return self.sink.apply(ctx, t);
					})
				} else if (_state == states.running) {
					child.parent = this;
					child.notify.apply(child, args);
				}
				return self;
			},

			isAlive: function() {
				return alive;
			},
			getState: function() {
				return _state;
			},

			isAborted: function() {
				return _state == states.abort;
			},

			isResolved: function() {
				return _state == states.end;
			}

		});
		
	}

	var fns = {
		du: function(topic, args) {
			// throw {
			// 	topic: topic,
			// 	args: args,
			// 	toString: function() {
			// 		return 'unknown topic: ' + topic;
			// 	}
			// }
		},
		subscribe: function(topic, fns) {
			this.pubsub.subscribe.apply(this.pubsub, arguments);
			return this;
		},
		ondone: function() {
			this.promise.done.apply(this.promise, arguments);
			return this;
		},
		onabort: function() {
			this.promise.fail.apply(this.promise, arguments);
			return this;
		},
		progress: function() {
			this.promise.progress.apply(this.promise, arguments);
			return this;
		},
		raise: function(topic) {
			this.parent && this.parent.notify.apply(this.parent, arguments);
			return this;
		},
		
	}

	$.extend(_activity.prototype, fns);

	var original = $.Activity;

	$.Activity = function(parent) {
		return new _activity(parent);
	};

	$.Activity.noConflict = function() {
		$.Activity = original;
		return this;
	}

}(jQuery);