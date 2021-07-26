(function (f) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f();
  } else if (typeof define === "function" && define.amd) {
    define([], f);
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      g = this;
    }
    g.Pjax = f();
  }
})(function () {
  var define, module, exports;
  return (function () {
    function r(e, n, t) {
      function o(i, f) {
        if (!n[i]) {
          if (!e[i]) {
            var c = "function" == typeof require && require;
            if (!f && c) return c(i, !0);
            if (u) return u(i, !0);
            var a = new Error("Cannot find module '" + i + "'");
            throw ((a.code = "MODULE_NOT_FOUND"), a);
          }
          var p = (n[i] = { exports: {} });
          e[i][0].call(
            p.exports,
            function (r) {
              var n = e[i][1][r];
              return o(n || r);
            },
            p,
            p.exports,
            r,
            e,
            n,
            t
          );
        }
        return n[i].exports;
      }
      for (
        var u = "function" == typeof require && require, i = 0;
        i < t.length;
        i++
      )
        o(t[i]);
      return o;
    }
    return r;
  })()(
    {
      1: [
        function (require, module, exports) {
          var executeScripts = require("./lib/execute-scripts");
          var forEachEls = require("./lib/foreach-els");
          var parseOptions = require("./lib/parse-options");
          var switches = require("./lib/switches");
          var newUid = require("./lib/uniqueid");
          var on = require("./lib/events/on");
          var trigger = require("./lib/events/trigger");
          var clone = require("./lib/util/clone");
          var contains = require("./lib/util/contains");
          var extend = require("./lib/util/extend");
          var noop = require("./lib/util/noop");
          var Pjax = function (options) {
            this.state = { numPendingSwitches: 0, href: null, options: null };
            this.options = parseOptions(options);
            this.log("Pjax options", this.options);
            if (
              this.options.scrollRestoration &&
              "scrollRestoration" in history
            ) {
              history.scrollRestoration = "manual";
            }
            this.maxUid = this.lastUid = newUid();
            this.parseDOM(document);
            on(
              window,
              "popstate",
              function (st) {
                if (st.state) {
                  var opt = clone(this.options);
                  opt.url = st.state.url;
                  opt.title = st.state.title;
                  opt.history = false;
                  opt.scrollPos = st.state.scrollPos;
                  if (st.state.uid < this.lastUid) {
                    opt.backward = true;
                  } else {
                    opt.forward = true;
                  }
                  this.lastUid = st.state.uid;
                  this.loadUrl(st.state.url, opt);
                }
              }.bind(this)
            );
          };
          Pjax.switches = switches;
          Pjax.prototype = {
            log: require("./lib/proto/log"),
            getElements: function (el) {
              return el.querySelectorAll(this.options.elements);
            },
            parseDOM: function (el) {
              var parseElement = require("./lib/proto/parse-element");
              forEachEls(this.getElements(el), parseElement, this);
            },
            refresh: function (el) {
              this.parseDOM(el || document);
            },
            reload: function () {
              window.location.reload();
            },
            attachLink: require("./lib/proto/attach-link"),
            attachForm: require("./lib/proto/attach-form"),
            forEachSelectors: function (cb, context, DOMcontext) {
              return require("./lib/foreach-selectors").bind(this)(
                this.options.selectors,
                cb,
                context,
                DOMcontext
              );
            },
            switchSelectors: function (selectors, fromEl, toEl, options) {
              return require("./lib/switches-selectors").bind(this)(
                this.options.switches,
                this.options.switchesOptions,
                selectors,
                fromEl,
                toEl,
                options
              );
            },
            latestChance: function (href) {
              window.location = href;
            },
            onSwitch: function () {
              trigger(window, "resize scroll");
              this.state.numPendingSwitches--;
              if (this.state.numPendingSwitches === 0) {
                this.afterAllSwitches();
              }
            },
            loadContent: function (html, options) {
              if (typeof html !== "string") {
                trigger(document, "pjax:complete pjax:error", options);
                return;
              }
              var tmpEl = document.implementation.createHTMLDocument("pjax");
              var htmlRegex = /<html[^>]+>/gi;
              var htmlAttribsRegex = /\s?[a-z:]+(?:=['"][^'">]+['"])*/gi;
              var matches = html.match(htmlRegex);
              if (matches && matches.length) {
                matches = matches[0].match(htmlAttribsRegex);
                if (matches.length) {
                  matches.shift();
                  matches.forEach(function (htmlAttrib) {
                    var attr = htmlAttrib.trim().split("=");
                    if (attr.length === 1) {
                      tmpEl.documentElement.setAttribute(attr[0], true);
                    } else {
                      tmpEl.documentElement.setAttribute(
                        attr[0],
                        attr[1].slice(1, -1)
                      );
                    }
                  });
                }
              }
              tmpEl.documentElement.innerHTML = html;
              this.log(
                "load content",
                tmpEl.documentElement.attributes,
                tmpEl.documentElement.innerHTML.length
              );
              if (
                document.activeElement &&
                contains(
                  document,
                  this.options.selectors,
                  document.activeElement
                )
              ) {
                try {
                  document.activeElement.blur();
                } catch (e) {}
              }
              this.switchSelectors(
                this.options.selectors,
                tmpEl,
                document,
                options
              );
            },
            abortRequest: require("./lib/abort-request"),
            doRequest: require("./lib/send-request"),
            handleResponse: require("./lib/proto/handle-response"),
            loadUrl: function (href, options) {
              options =
                typeof options === "object"
                  ? extend({}, this.options, options)
                  : clone(this.options);
              this.log("load href", href, options);
              this.abortRequest(this.request);
              trigger(document, "pjax:send", options);
              this.request = this.doRequest(
                href,
                options,
                this.handleResponse.bind(this)
              );
            },
            afterAllSwitches: function () {
              var autofocusEl = Array.prototype.slice
                .call(document.querySelectorAll("[autofocus]"))
                .pop();
              if (autofocusEl && document.activeElement !== autofocusEl) {
                autofocusEl.focus();
              }
              this.options.selectors.forEach(function (selector) {
                forEachEls(document.querySelectorAll(selector), function (el) {
                  executeScripts(el);
                });
              });
              var state = this.state;
              if (state.options.history) {
                if (!window.history.state) {
                  this.lastUid = this.maxUid = newUid();
                  window.history.replaceState(
                    {
                      url: window.location.href,
                      title: document.title,
                      uid: this.maxUid,
                      scrollPos: [0, 0],
                    },
                    document.title
                  );
                }
                this.lastUid = this.maxUid = newUid();
                window.history.pushState(
                  {
                    url: state.href,
                    title: state.options.title,
                    uid: this.maxUid,
                    scrollPos: [0, 0],
                  },
                  state.options.title,
                  state.href
                );
              }
              this.forEachSelectors(function (el) {
                this.parseDOM(el);
              }, this);
              trigger(document, "pjax:complete pjax:success", state.options);
              if (typeof state.options.analytics === "function") {
                state.options.analytics();
              }
              if (state.options.history) {
                var a = document.createElement("a");
                a.href = this.state.href;
                if (a.hash) {
                  var name = a.hash.slice(1);
                  name = decodeURIComponent(name);
                  var curtop = 0;
                  var target =
                    document.getElementById(name) ||
                    document.getElementsByName(name)[0];
                  if (target) {
                    if (target.offsetParent) {
                      do {
                        curtop += target.offsetTop;
                        target = target.offsetParent;
                      } while (target);
                    }
                  }
                  window.scrollTo(0, curtop);
                } else if (state.options.scrollTo !== false) {
                  if (state.options.scrollTo.length > 1) {
                    window.scrollTo(
                      state.options.scrollTo[0],
                      state.options.scrollTo[1]
                    );
                  } else {
                    window.scrollTo(0, state.options.scrollTo);
                  }
                }
              } else if (
                state.options.scrollRestoration &&
                state.options.scrollPos
              ) {
                window.scrollTo(
                  state.options.scrollPos[0],
                  state.options.scrollPos[1]
                );
              }
              this.state = { numPendingSwitches: 0, href: null, options: null };
            },
          };
          Pjax.isSupported = require("./lib/is-supported");
          if (Pjax.isSupported()) {
            module.exports = Pjax;
          } else {
            var stupidPjax = noop;
            for (var key in Pjax.prototype) {
              if (
                Pjax.prototype.hasOwnProperty(key) &&
                typeof Pjax.prototype[key] === "function"
              ) {
                stupidPjax[key] = noop;
              }
            }
            module.exports = stupidPjax;
          }
        },
        {
          "./lib/abort-request": 2,
          "./lib/events/on": 4,
          "./lib/events/trigger": 5,
          "./lib/execute-scripts": 6,
          "./lib/foreach-els": 7,
          "./lib/foreach-selectors": 8,
          "./lib/is-supported": 9,
          "./lib/parse-options": 10,
          "./lib/proto/attach-form": 11,
          "./lib/proto/attach-link": 12,
          "./lib/proto/handle-response": 13,
          "./lib/proto/log": 14,
          "./lib/proto/parse-element": 15,
          "./lib/send-request": 16,
          "./lib/switches": 18,
          "./lib/switches-selectors": 17,
          "./lib/uniqueid": 19,
          "./lib/util/clone": 20,
          "./lib/util/contains": 21,
          "./lib/util/extend": 22,
          "./lib/util/noop": 23,
        },
      ],
      2: [
        function (require, module, exports) {
          var noop = require("./util/noop");
          module.exports = function (request) {
            if (request && request.readyState < 4) {
              request.onreadystatechange = noop;
              request.abort();
            }
          };
        },
        { "./util/noop": 23 },
      ],
      3: [
        function (require, module, exports) {
          module.exports = function (el) {
            var code = el.text || el.textContent || el.innerHTML || "";
            var src = el.src || "";
            var parent =
              el.parentNode ||
              document.querySelector("head") ||
              document.documentElement;
            var script = document.createElement("script");
            if (code.match("document.write")) {
              if (console && console.log) {
                console.log(
                  "Script contains document.write. Can’t be executed correctly. Code skipped ",
                  el
                );
              }
              return false;
            }
            script.type = "text/javascript";
            script.id = el.id;
            if (src !== "") {
              script.src = src;
              script.async = false;
            }
            if (code !== "") {
              try {
                script.appendChild(document.createTextNode(code));
              } catch (e) {
                script.text = code;
              }
            }
            parent.appendChild(script);
            if (
              (parent instanceof HTMLHeadElement ||
                parent instanceof HTMLBodyElement) &&
              parent.contains(script)
            ) {
              parent.removeChild(script);
            }
            return true;
          };
        },
        {},
      ],
      4: [
        function (require, module, exports) {
          var forEachEls = require("../foreach-els");
          module.exports = function (els, events, listener, useCapture) {
            events = typeof events === "string" ? events.split(" ") : events;
            events.forEach(function (e) {
              forEachEls(els, function (el) {
                el.addEventListener(e, listener, useCapture);
              });
            });
          };
        },
        { "../foreach-els": 7 },
      ],
      5: [
        function (require, module, exports) {
          var forEachEls = require("../foreach-els");
          module.exports = function (els, events, opts) {
            events = typeof events === "string" ? events.split(" ") : events;
            events.forEach(function (e) {
              var event;
              event = document.createEvent("HTMLEvents");
              event.initEvent(e, true, true);
              event.eventName = e;
              if (opts) {
                Object.keys(opts).forEach(function (key) {
                  event[key] = opts[key];
                });
              }
              forEachEls(els, function (el) {
                var domFix = false;
                if (!el.parentNode && el !== document && el !== window) {
                  domFix = true;
                  document.body.appendChild(el);
                }
                el.dispatchEvent(event);
                if (domFix) {
                  el.parentNode.removeChild(el);
                }
              });
            });
          };
        },
        { "../foreach-els": 7 },
      ],
      6: [
        function (require, module, exports) {
          var forEachEls = require("./foreach-els");
          var evalScript = require("./eval-script");
          module.exports = function (el) {
            if (el.tagName.toLowerCase() === "script") {
              evalScript(el);
            }
            forEachEls(el.querySelectorAll("script"), function (script) {
              if (
                !script.type ||
                script.type.toLowerCase() === "text/javascript"
              ) {
                if (script.parentNode) {
                  script.parentNode.removeChild(script);
                }
                evalScript(script);
              }
            });
          };
        },
        { "./eval-script": 3, "./foreach-els": 7 },
      ],
      7: [
        function (require, module, exports) {
          module.exports = function (els, fn, context) {
            if (
              els instanceof HTMLCollection ||
              els instanceof NodeList ||
              els instanceof Array
            ) {
              return Array.prototype.forEach.call(els, fn, context);
            }
            return fn.call(context, els);
          };
        },
        {},
      ],
      8: [
        function (require, module, exports) {
          var forEachEls = require("./foreach-els");
          module.exports = function (selectors, cb, context, DOMcontext) {
            DOMcontext = DOMcontext || document;
            selectors.forEach(function (selector) {
              forEachEls(DOMcontext.querySelectorAll(selector), cb, context);
            });
          };
        },
        { "./foreach-els": 7 },
      ],
      9: [
        function (require, module, exports) {
          module.exports = function () {
            return (
              window.history &&
              window.history.pushState &&
              window.history.replaceState &&
              !navigator.userAgent.match(
                /((iPod|iPhone|iPad).+\bOS\s+[1-4]\D|WebApps\/.+CFNetwork)/
              )
            );
          };
        },
        {},
      ],
      10: [
        function (require, module, exports) {
          var defaultSwitches = require("./switches");
          module.exports = function (options) {
            options = options || {};
            options.elements = options.elements || "a[href], form[action]";
            options.selectors = options.selectors || ["title", ".js-Pjax"];
            options.switches = options.switches || {};
            options.switchesOptions = options.switchesOptions || {};
            options.history =
              typeof options.history === "undefined" ? true : options.history;
            options.analytics =
              typeof options.analytics === "function" ||
              options.analytics === false
                ? options.analytics
                : defaultAnalytics;
            options.scrollTo =
              typeof options.scrollTo === "undefined" ? 0 : options.scrollTo;
            options.scrollRestoration =
              typeof options.scrollRestoration !== "undefined"
                ? options.scrollRestoration
                : true;
            options.cacheBust =
              typeof options.cacheBust === "undefined"
                ? true
                : options.cacheBust;
            options.debug = options.debug || false;
            options.timeout = options.timeout || 0;
            options.currentUrlFullReload =
              typeof options.currentUrlFullReload === "undefined"
                ? false
                : options.currentUrlFullReload;
            if (!options.switches.head) {
              options.switches.head = defaultSwitches.switchElementsAlt;
            }
            if (!options.switches.body) {
              options.switches.body = defaultSwitches.switchElementsAlt;
            }
            return options;
          };
          function defaultAnalytics() {
            if (window._gaq) {
              _gaq.push(["_trackPageview"]);
            }
            if (window.ga) {
              ga("send", "pageview", {
                page: location.pathname,
                title: document.title,
              });
            }
          }
        },
        { "./switches": 18 },
      ],
      11: [
        function (require, module, exports) {
          var on = require("../events/on");
          var clone = require("../util/clone");
          var attrState = "data-pjax-state";
          var formAction = function (el, event) {
            if (isDefaultPrevented(event)) {
              return;
            }
            var options = clone(this.options);
            options.requestOptions = {
              requestUrl: el.getAttribute("action") || window.location.href,
              requestMethod: el.getAttribute("method") || "GET",
            };
            var virtLinkElement = document.createElement("a");
            virtLinkElement.setAttribute(
              "href",
              options.requestOptions.requestUrl
            );
            var attrValue = checkIfShouldAbort(virtLinkElement, options);
            if (attrValue) {
              el.setAttribute(attrState, attrValue);
              return;
            }
            event.preventDefault();
            if (el.enctype === "multipart/form-data") {
              options.requestOptions.formData = new FormData(el);
            } else {
              options.requestOptions.requestParams = parseFormElements(el);
            }
            el.setAttribute(attrState, "submit");
            options.triggerElement = el;
            this.loadUrl(virtLinkElement.href, options);
          };
          function parseFormElements(el) {
            var requestParams = [];
            var formElements = el.elements;
            for (var i = 0; i < formElements.length; i++) {
              var element = formElements[i];
              var tagName = element.tagName.toLowerCase();
              if (
                !!element.name &&
                element.attributes !== undefined &&
                tagName !== "button"
              ) {
                var type = element.attributes.type;
                if (
                  !type ||
                  (type.value !== "checkbox" && type.value !== "radio") ||
                  element.checked
                ) {
                  var values = [];
                  if (tagName === "select") {
                    var opt;
                    for (var j = 0; j < element.options.length; j++) {
                      opt = element.options[j];
                      if (opt.selected && !opt.disabled) {
                        values.push(
                          opt.hasAttribute("value") ? opt.value : opt.text
                        );
                      }
                    }
                  } else {
                    values.push(element.value);
                  }
                  for (var k = 0; k < values.length; k++) {
                    requestParams.push({
                      name: encodeURIComponent(element.name),
                      value: encodeURIComponent(values[k]),
                    });
                  }
                }
              }
            }
            return requestParams;
          }
          function checkIfShouldAbort(virtLinkElement, options) {
            if (
              virtLinkElement.protocol !== window.location.protocol ||
              virtLinkElement.host !== window.location.host
            ) {
              return "external";
            }
            if (
              virtLinkElement.hash &&
              virtLinkElement.href.replace(virtLinkElement.hash, "") ===
                window.location.href.replace(location.hash, "")
            ) {
              return "anchor";
            }
            if (
              virtLinkElement.href ===
              window.location.href.split("#")[0] + "#"
            ) {
              return "anchor-empty";
            }
            if (
              options.currentUrlFullReload &&
              virtLinkElement.href === window.location.href.split("#")[0]
            ) {
              return "reload";
            }
          }
          var isDefaultPrevented = function (event) {
            return event.defaultPrevented || event.returnValue === false;
          };
          module.exports = function (el) {
            var that = this;
            el.setAttribute(attrState, "");
            on(el, "submit", function (event) {
              formAction.call(that, el, event);
            });
          };
        },
        { "../events/on": 4, "../util/clone": 20 },
      ],
      12: [
        function (require, module, exports) {
          var on = require("../events/on");
          var clone = require("../util/clone");
          var attrState = "data-pjax-state";
          var linkAction = function (el, event) {
            if (isDefaultPrevented(event)) {
              return;
            }
            var options = clone(this.options);
            var attrValue = checkIfShouldAbort(el, event);
            if (attrValue) {
              el.setAttribute(attrState, attrValue);
              return;
            }
            event.preventDefault();
            if (
              this.options.currentUrlFullReload &&
              el.href === window.location.href.split("#")[0]
            ) {
              el.setAttribute(attrState, "reload");
              this.reload();
              return;
            }
            el.setAttribute(attrState, "load");
            options.triggerElement = el;
            this.loadUrl(el.href, options);
          };
          function checkIfShouldAbort(el, event) {
            if (
              event.which > 1 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return "modifier";
            }
            if (
              el.protocol !== window.location.protocol ||
              el.host !== window.location.host
            ) {
              return "external";
            }
            if (
              el.hash &&
              el.href.replace(el.hash, "") ===
                window.location.href.replace(location.hash, "")
            ) {
              return "anchor";
            }
            if (el.href === window.location.href.split("#")[0] + "#") {
              return "anchor-empty";
            }
          }
          var isDefaultPrevented = function (event) {
            return event.defaultPrevented || event.returnValue === false;
          };
          module.exports = function (el) {
            var that = this;
            el.setAttribute(attrState, "");
            on(el, "click", function (event) {
              linkAction.call(that, el, event);
            });
            on(
              el,
              "keyup",
              function (event) {
                if (event.keyCode === 13) {
                  linkAction.call(that, el, event);
                }
              }.bind(this)
            );
          };
        },
        { "../events/on": 4, "../util/clone": 20 },
      ],
      13: [
        function (require, module, exports) {
          var clone = require("../util/clone");
          var newUid = require("../uniqueid");
          var trigger = require("../events/trigger");
          module.exports = function (responseText, request, href, options) {
            options = clone(options || this.options);
            options.request = request;
            if (responseText === false) {
              trigger(document, "pjax:complete pjax:error", options);
              return;
            }
            var currentState = window.history.state || {};
            window.history.replaceState(
              {
                url: currentState.url || window.location.href,
                title: currentState.title || document.title,
                uid: currentState.uid || newUid(),
                scrollPos: [
                  document.documentElement.scrollLeft ||
                    document.body.scrollLeft,
                  document.documentElement.scrollTop || document.body.scrollTop,
                ],
              },
              document.title,
              window.location.href
            );
            var oldHref = href;
            if (request.responseURL) {
              if (href !== request.responseURL) {
                href = request.responseURL;
              }
            } else if (request.getResponseHeader("X-PJAX-URL")) {
              href = request.getResponseHeader("X-PJAX-URL");
            } else if (request.getResponseHeader("X-XHR-Redirected-To")) {
              href = request.getResponseHeader("X-XHR-Redirected-To");
            }
            var a = document.createElement("a");
            a.href = oldHref;
            var oldHash = a.hash;
            a.href = href;
            if (oldHash && !a.hash) {
              a.hash = oldHash;
              href = a.href;
            }
            this.state.href = href;
            this.state.options = options;
            try {
              this.loadContent(responseText, options);
            } catch (e) {
              trigger(document, "pjax:error", options);
              if (!this.options.debug) {
                if (console && console.error) {
                  console.error("Pjax switch fail: ", e);
                }
                return this.latestChance(href);
              } else {
                throw e;
              }
            }
          };
        },
        { "../events/trigger": 5, "../uniqueid": 19, "../util/clone": 20 },
      ],
      14: [
        function (require, module, exports) {
          module.exports = function () {
            if (this.options.debug && console) {
              if (typeof console.log === "function") {
                console.log.apply(console, arguments);
              } else if (console.log) {
                console.log(arguments);
              }
            }
          };
        },
        {},
      ],
      15: [
        function (require, module, exports) {
          var attrState = "data-pjax-state";
          module.exports = function (el) {
            switch (el.tagName.toLowerCase()) {
              case "a":
                if (!el.hasAttribute(attrState)) {
                  this.attachLink(el);
                }
                break;
              case "form":
                if (!el.hasAttribute(attrState)) {
                  this.attachForm(el);
                }
                break;
              default:
                throw "Pjax can only be applied on <a> or <form> submit";
            }
          };
        },
        {},
      ],
      16: [
        function (require, module, exports) {
          var updateQueryString = require("./util/update-query-string");
          module.exports = function (location, options, callback) {
            options = options || {};
            var queryString;
            var requestOptions = options.requestOptions || {};
            var requestMethod = (
              requestOptions.requestMethod || "GET"
            ).toUpperCase();
            var requestParams = requestOptions.requestParams || null;
            var formData = requestOptions.formData || null;
            var requestPayload = null;
            var request = new XMLHttpRequest();
            var timeout = options.timeout || 0;
            request.onreadystatechange = function () {
              if (request.readyState === 4) {
                if (request.status === 200) {
                  callback(request.responseText, request, location, options);
                } else if (request.status !== 0) {
                  callback(null, request, location, options);
                }
              }
            };
            request.onerror = function (e) {
              console.log(e);
              callback(null, request, location, options);
            };
            request.ontimeout = function () {
              callback(null, request, location, options);
            };
            if (requestParams && requestParams.length) {
              queryString = requestParams
                .map(function (param) {
                  return param.name + "=" + param.value;
                })
                .join("&");
              switch (requestMethod) {
                case "GET":
                  location = location.split("?")[0];
                  location += "?" + queryString;
                  break;
                case "POST":
                  requestPayload = queryString;
                  break;
              }
            } else if (formData) {
              requestPayload = formData;
            }
            if (options.cacheBust) {
              location = updateQueryString(location, "t", Date.now());
            }
            request.open(requestMethod, location, true);
            request.timeout = timeout;
            request.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            request.setRequestHeader("X-PJAX", "true");
            request.setRequestHeader(
              "X-PJAX-Selectors",
              JSON.stringify(options.selectors)
            );
            if (requestPayload && requestMethod === "POST" && !formData) {
              request.setRequestHeader(
                "Content-Type",
                "application/x-www-form-urlencoded"
              );
            }
            request.send(requestPayload);
            return request;
          };
        },
        { "./util/update-query-string": 24 },
      ],
      17: [
        function (require, module, exports) {
          var forEachEls = require("./foreach-els");
          var defaultSwitches = require("./switches");
          module.exports = function (
            switches,
            switchesOptions,
            selectors,
            fromEl,
            toEl,
            options
          ) {
            var switchesQueue = [];
            selectors.forEach(function (selector) {
              var newEls = fromEl.querySelectorAll(selector);
              var oldEls = toEl.querySelectorAll(selector);
              if (this.log) {
                this.log("Pjax switch", selector, newEls, oldEls);
              }
              if (newEls.length !== oldEls.length) {
                throw (
                  "DOM doesn’t look the same on new loaded page: ’" +
                  selector +
                  "’ - new " +
                  newEls.length +
                  ", old " +
                  oldEls.length
                );
              }
              forEachEls(
                newEls,
                function (newEl, i) {
                  var oldEl = oldEls[i];
                  if (this.log) {
                    this.log("newEl", newEl, "oldEl", oldEl);
                  }
                  var callback = switches[selector]
                    ? switches[selector].bind(
                        this,
                        oldEl,
                        newEl,
                        options,
                        switchesOptions[selector]
                      )
                    : defaultSwitches.outerHTML.bind(
                        this,
                        oldEl,
                        newEl,
                        options
                      );
                  switchesQueue.push(callback);
                },
                this
              );
            }, this);
            this.state.numPendingSwitches = switchesQueue.length;
            switchesQueue.forEach(function (queuedSwitch) {
              queuedSwitch();
            });
          };
        },
        { "./foreach-els": 7, "./switches": 18 },
      ],
      18: [
        function (require, module, exports) {
          var on = require("./events/on");
          module.exports = {
            outerHTML: function (oldEl, newEl) {
              oldEl.outerHTML = newEl.outerHTML;
              this.onSwitch();
            },
            innerHTML: function (oldEl, newEl) {
              oldEl.innerHTML = newEl.innerHTML;
              if (newEl.className === "") {
                oldEl.removeAttribute("class");
              } else {
                oldEl.className = newEl.className;
              }
              this.onSwitch();
            },
            switchElementsAlt: function (oldEl, newEl) {
              oldEl.innerHTML = newEl.innerHTML;
              if (newEl.hasAttributes()) {
                var attrs = newEl.attributes;
                for (var i = 0; i < attrs.length; i++) {
                  oldEl.attributes.setNamedItem(attrs[i].cloneNode());
                }
              }
              this.onSwitch();
            },
            replaceNode: function (oldEl, newEl) {
              oldEl.parentNode.replaceChild(newEl, oldEl);
              this.onSwitch();
            },
            sideBySide: function (oldEl, newEl, options, switchOptions) {
              var forEach = Array.prototype.forEach;
              var elsToRemove = [];
              var elsToAdd = [];
              var fragToAppend = document.createDocumentFragment();
              var animationEventNames =
                "animationend webkitAnimationEnd MSAnimationEnd oanimationend";
              var animatedElsNumber = 0;
              var sexyAnimationEnd = function (e) {
                if (e.target !== e.currentTarget) {
                  return;
                }
                animatedElsNumber--;
                if (animatedElsNumber <= 0 && elsToRemove) {
                  elsToRemove.forEach(function (el) {
                    if (el.parentNode) {
                      el.parentNode.removeChild(el);
                    }
                  });
                  elsToAdd.forEach(function (el) {
                    el.className = el.className.replace(
                      el.getAttribute("data-pjax-classes"),
                      ""
                    );
                    el.removeAttribute("data-pjax-classes");
                  });
                  elsToAdd = null;
                  elsToRemove = null;
                  this.onSwitch();
                }
              }.bind(this);
              switchOptions = switchOptions || {};
              forEach.call(oldEl.childNodes, function (el) {
                elsToRemove.push(el);
                if (el.classList && !el.classList.contains("js-Pjax-remove")) {
                  if (el.hasAttribute("data-pjax-classes")) {
                    el.className = el.className.replace(
                      el.getAttribute("data-pjax-classes"),
                      ""
                    );
                    el.removeAttribute("data-pjax-classes");
                  }
                  el.classList.add("js-Pjax-remove");
                  if (
                    switchOptions.callbacks &&
                    switchOptions.callbacks.removeElement
                  ) {
                    switchOptions.callbacks.removeElement(el);
                  }
                  if (switchOptions.classNames) {
                    el.className +=
                      " " +
                      switchOptions.classNames.remove +
                      " " +
                      (options.backward
                        ? switchOptions.classNames.backward
                        : switchOptions.classNames.forward);
                  }
                  animatedElsNumber++;
                  on(el, animationEventNames, sexyAnimationEnd, true);
                }
              });
              forEach.call(newEl.childNodes, function (el) {
                if (el.classList) {
                  var addClasses = "";
                  if (switchOptions.classNames) {
                    addClasses =
                      " js-Pjax-add " +
                      switchOptions.classNames.add +
                      " " +
                      (options.backward
                        ? switchOptions.classNames.forward
                        : switchOptions.classNames.backward);
                  }
                  if (
                    switchOptions.callbacks &&
                    switchOptions.callbacks.addElement
                  ) {
                    switchOptions.callbacks.addElement(el);
                  }
                  el.className += addClasses;
                  el.setAttribute("data-pjax-classes", addClasses);
                  elsToAdd.push(el);
                  fragToAppend.appendChild(el);
                  animatedElsNumber++;
                  on(el, animationEventNames, sexyAnimationEnd, true);
                }
              });
              oldEl.className = newEl.className;
              oldEl.appendChild(fragToAppend);
            },
          };
        },
        { "./events/on": 4 },
      ],
      19: [
        function (require, module, exports) {
          module.exports = (function () {
            var counter = 0;
            return function () {
              var id = "pjax" + new Date().getTime() + "_" + counter;
              counter++;
              return id;
            };
          })();
        },
        {},
      ],
      20: [
        function (require, module, exports) {
          module.exports = function (obj) {
            if (null === obj || "object" !== typeof obj) {
              return obj;
            }
            var copy = obj.constructor();
            for (var attr in obj) {
              if (obj.hasOwnProperty(attr)) {
                copy[attr] = obj[attr];
              }
            }
            return copy;
          };
        },
        {},
      ],
      21: [
        function (require, module, exports) {
          module.exports = function contains(doc, selectors, el) {
            for (var i = 0; i < selectors.length; i++) {
              var selectedEls = doc.querySelectorAll(selectors[i]);
              for (var j = 0; j < selectedEls.length; j++) {
                if (selectedEls[j].contains(el)) {
                  return true;
                }
              }
            }
            return false;
          };
        },
        {},
      ],
      22: [
        function (require, module, exports) {
          module.exports = function (target) {
            if (target == null) {
              return null;
            }
            var to = Object(target);
            for (var i = 1; i < arguments.length; i++) {
              var source = arguments[i];
              if (source != null) {
                for (var key in source) {
                  if (Object.prototype.hasOwnProperty.call(source, key)) {
                    to[key] = source[key];
                  }
                }
              }
            }
            return to;
          };
        },
        {},
      ],
      23: [
        function (require, module, exports) {
          module.exports = function () {};
        },
        {},
      ],
      24: [
        function (require, module, exports) {
          module.exports = function (uri, key, value) {
            var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
            var separator = uri.indexOf("?") !== -1 ? "&" : "?";
            if (uri.match(re)) {
              return uri.replace(re, "$1" + key + "=" + value + "$2");
            } else {
              return uri + separator + key + "=" + value;
            }
          };
        },
        {},
      ],
    },
    {},
    [1]
  )(1);
});
