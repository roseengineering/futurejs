/*! 
 * future.js - a small, compliant promises/A+ implentation
 * Copyright 2013 Rose Engineering.  Licensed under the GPLv3.
 */
(function(factory) {
    if (typeof window !== 'undefined') {
        window.Future = factory();
    } else {
        module.exports = factory();
    }
})(function() {

    function isFunction(obj) {
        return typeof obj === 'function';
    }
    function isObject(obj) {
        return obj !== null && typeof obj === 'object';
    }
    var nextTick = (function() {
        return typeof setImmediate === 'function' ?  
            function (fn) { setImmediate(fn); } : 
            function (fn) { setTimeout(fn, 0); };
    })();

    function Promise(resolver) {
        var waiting = [];
        var resolved = false;
        var rejected = false;
        var resolving = false;
        var result;

        function handle(deferred) {
            if (!resolved) { 
                return waiting.push(deferred); 
            }
            var cb = rejected ? deferred.onrejected : deferred.onfulfilled;
            if (!isFunction(cb) && !rejected) cb = deferred.onrejected;
            try {
                var ret = isFunction(cb) ? cb(result) : result;
            } catch(err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve(ret);
        }

        function fulfill(_rejected, value) {
            rejected = _rejected;
            resolved = true;
            result = value;
            waiting.forEach(handle);
        }

        function adopt(value) {
            if (self === value) {
                fulfill(true, new TypeError());
                return true;
            } else if (isFunction(value) || isObject(value)) {
                try {
                    var then = value.then;
                } catch(err) {   
                    fulfill(true, err);
                    return true;
                }
                if (isFunction(then)) {
                    var called = false;
                    try {
                        then.call(value, function(val) {
                            if (!called && !adopt(val)) { 
                                fulfill(false, val); 
                            }
                            called = true;
                        }, function(val) {
                            if (!called && !adopt(val)) { 
                                fulfill(true, val); 
                            }
                            called = true;
                        });
                    } catch(err) {
                        if (!called) { 
                            fulfill(true, err); 
                        }
                    }
                    return true;
                }
            }
        }

        function thenable(_rejected, value) {
            if (resolving) { return; }
            resolving = true;
            if (!adopt(value)) { 
                fulfill(_rejected, value); 
            }
        }

        resolver(function(value) {
            nextTick(function() { thenable(false, value); });
        }, function(value) { 
            nextTick(function() { thenable(true, value); });
        });

        var self = {
            fail: function(callback) {
                return this.then(function() {}, callback);
            },
            fin: function(callback) {
                this.then(null, callback);
            },
            then: function(onfulfilled, onrejected) {
                var deferred = {
                    onfulfilled: onfulfilled,
                    onrejected: onrejected,
                };
                deferred.promise = Promise(function(resolve, reject) {
                    deferred.resolve = resolve;
                    deferred.reject = reject;
                });
                nextTick(function() {
                    handle(deferred);
                });
                return deferred.promise;
            }
        }
        return self;
    }

    function deferred() {
        var self = {};
        self.promise = Promise(function(resolve, reject) {
            self.resolve = resolve;
            self.reject = reject;
        });
        return self;
    }

    return {
        Promise: Promise,
        deferred: deferred,
        version: '0.9.0',
    }
});
