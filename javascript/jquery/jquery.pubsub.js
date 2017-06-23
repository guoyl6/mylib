// version: 0
+function($) {
	var original = $.pubsub;
	
	var myCallbacks = function() {
		var list = [], fireIndex = 0, firing = false;
		return {
			add: function(fn) {
				if ($.isFunction(fn)) {
					list.push(fn);
				}
				return this;
			},
			remove: function(fn) {
				var index = list.indexOf(fn);
				if (index != -1) {
					list.splice(index, 1);
					if (index <= fireIndex) {
						fireIndex--;
					}
				}
				return this;
			},
			getLength: function() {
				return list.length;
			},
			fire: function() {
				this.fireWith(this, arguments);
				return this;
			},
			fireWith: function(ctx, args) {
				if (firing) {
					return this;
				}
				firing = true;
				fireIndex = 0;
				for (var i = 0; i < list.length; i++) {
					var fn = list[i];
					fn.apply(ctx, args);
				}
				firing = false;
				return this;
			},
			empty: function() {
				list = [];
			},
			get: function() {
				return list.slice();
			},
			
		}
	}

	function pubsub() {
		var topics = {}, self = this;


		$.extend(this, {
			subscribe: function(topic, fns) {

				if (!(topic in topics)) {
					var rt = this.parseTopic(topic),
					    callbacks = this.createCallbacks();
					Object.defineProperty(topics, topic, {
						get: function() {
							return callbacks;
						}
					})
				}

				var cb = topics[topic];
				for (var i = 1, len = arguments.length; i < len; i++) {
					cb.add(arguments[i]);
				}
				return this;
			},
			one: function(topic, fns) {
				var self = this;
				for (var i = 1, len = arguments.length; i < len; i++) {
					self.subscribe(topic, (function(fn) {
						var rf = function() {
							self.unsubscribe(topic, rf);
							return fn.apply(this, arguments);
						}
						return rf;
					})(arguments[i]));
				}
			},

			publish: function(topic) {
				var args = Array.prototype.slice.call(arguments, 1);
				return this.publishWith(this, topic, args);
			},
			publishWith: function(ctx, topic, args) {
				var cb = topics[topic];

				cb && cb.fireWith(ctx, args);

				topic != "*" && this.publishWith(ctx, "*", args);

				return this;
			},

			unsubscribe: function(topic, fns) {
				var cb = topics[topic];
				if (!cb) {
					return this;
				}
				for (var i = 1, len = arguments.length; i < len; i++) {
					cb.remove(arguments[i]);
				}
				return this;
			},
			empty: function(topic) {
				var cb = topics[topic];
				cb && cb.empty();
				return this;
			},
			clear: function(topic) {
				delete topics[topic];
			},
			purge: function() {
				topics = {};
				return this;
			},
			
			has: function(topic) {
				return topic in topics;
			},
			getCb: function(topic) {
				var cb = topics[topic];
				return cb ? cb.get() : [];
			}


		})
	}

	pubsub.prototype.parseTopic = function(topic) {
		return topic;
	}

	pubsub.prototype.createCallbacks = function() {
		return topic;
	}


	$.pubsub = function() {
		return new pubsub();
	};
	$.pubsub.noConflict = function() {
		$.pubsub = original;
		return this;
	}
}(jQuery);