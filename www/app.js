(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name2 in all)
      __defProp(target, name2, { get: all[name2], enumerable: true });
  };

  // node_modules/@capacitor/core/dist/index.js
  var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
  var init_dist = __esm({
    "node_modules/@capacitor/core/dist/index.js"() {
      (function(ExceptionCode2) {
        ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
        ExceptionCode2["Unavailable"] = "UNAVAILABLE";
      })(ExceptionCode || (ExceptionCode = {}));
      CapacitorException = class extends Error {
        constructor(message, code, data) {
          super(message);
          this.message = message;
          this.code = code;
          this.data = data;
        }
      };
      getPlatformId = (win) => {
        var _a, _b;
        if (win === null || win === void 0 ? void 0 : win.androidBridge) {
          return "android";
        } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
          return "ios";
        } else {
          return "web";
        }
      };
      createCapacitor = (win) => {
        const capCustomPlatform = win.CapacitorCustomPlatform || null;
        const cap = win.Capacitor || {};
        const Plugins = cap.Plugins = cap.Plugins || {};
        const getPlatform = () => {
          return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
        };
        const isNativePlatform = () => getPlatform() !== "web";
        const isPluginAvailable = (pluginName) => {
          const plugin = registeredPlugins.get(pluginName);
          if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
            return true;
          }
          if (getPluginHeader(pluginName)) {
            return true;
          }
          return false;
        };
        const getPluginHeader = (pluginName) => {
          var _a;
          return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
        };
        const handleError = (err) => win.console.error(err);
        const registeredPlugins = /* @__PURE__ */ new Map();
        const registerPlugin2 = (pluginName, jsImplementations = {}) => {
          const registeredPlugin = registeredPlugins.get(pluginName);
          if (registeredPlugin) {
            console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
            return registeredPlugin.proxy;
          }
          const platform = getPlatform();
          const pluginHeader = getPluginHeader(pluginName);
          let jsImplementation;
          const loadPluginImplementation = async () => {
            if (!jsImplementation && platform in jsImplementations) {
              jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
            } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
              jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
            }
            return jsImplementation;
          };
          const createPluginMethod = (impl, prop) => {
            var _a, _b;
            if (pluginHeader) {
              const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
              if (methodHeader) {
                if (methodHeader.rtype === "promise") {
                  return (options) => cap.nativePromise(pluginName, prop.toString(), options);
                } else {
                  return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
                }
              } else if (impl) {
                return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
              }
            } else if (impl) {
              return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
            } else {
              throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
            }
          };
          const createPluginMethodWrapper = (prop) => {
            let remove;
            const wrapper = (...args) => {
              const p = loadPluginImplementation().then((impl) => {
                const fn = createPluginMethod(impl, prop);
                if (fn) {
                  const p2 = fn(...args);
                  remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                  return p2;
                } else {
                  throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
                }
              });
              if (prop === "addListener") {
                p.remove = async () => remove();
              }
              return p;
            };
            wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
            Object.defineProperty(wrapper, "name", {
              value: prop,
              writable: false,
              configurable: false
            });
            return wrapper;
          };
          const addListener = createPluginMethodWrapper("addListener");
          const removeListener = createPluginMethodWrapper("removeListener");
          const addListenerNative = (eventName, callback) => {
            const call = addListener({ eventName }, callback);
            const remove = async () => {
              const callbackId = await call;
              removeListener({
                eventName,
                callbackId
              }, callback);
            };
            const p = new Promise((resolve) => call.then(() => resolve({ remove })));
            p.remove = async () => {
              console.warn(`Using addListener() without 'await' is deprecated.`);
              await remove();
            };
            return p;
          };
          const proxy = new Proxy({}, {
            get(_, prop) {
              switch (prop) {
                // https://github.com/facebook/react/issues/20030
                case "$$typeof":
                  return void 0;
                case "toJSON":
                  return () => ({});
                case "addListener":
                  return pluginHeader ? addListenerNative : addListener;
                case "removeListener":
                  return removeListener;
                default:
                  return createPluginMethodWrapper(prop);
              }
            }
          });
          Plugins[pluginName] = proxy;
          registeredPlugins.set(pluginName, {
            name: pluginName,
            proxy,
            platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
          });
          return proxy;
        };
        if (!cap.convertFileSrc) {
          cap.convertFileSrc = (filePath) => filePath;
        }
        cap.getPlatform = getPlatform;
        cap.handleError = handleError;
        cap.isNativePlatform = isNativePlatform;
        cap.isPluginAvailable = isPluginAvailable;
        cap.registerPlugin = registerPlugin2;
        cap.Exception = CapacitorException;
        cap.DEBUG = !!cap.DEBUG;
        cap.isLoggingEnabled = !!cap.isLoggingEnabled;
        return cap;
      };
      initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
      Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
      registerPlugin = Capacitor.registerPlugin;
      WebPlugin = class {
        constructor() {
          this.listeners = {};
          this.retainedEventArguments = {};
          this.windowListeners = {};
        }
        addListener(eventName, listenerFunc) {
          let firstListener = false;
          const listeners = this.listeners[eventName];
          if (!listeners) {
            this.listeners[eventName] = [];
            firstListener = true;
          }
          this.listeners[eventName].push(listenerFunc);
          const windowListener = this.windowListeners[eventName];
          if (windowListener && !windowListener.registered) {
            this.addWindowListener(windowListener);
          }
          if (firstListener) {
            this.sendRetainedArgumentsForEvent(eventName);
          }
          const remove = async () => this.removeListener(eventName, listenerFunc);
          const p = Promise.resolve({ remove });
          return p;
        }
        async removeAllListeners() {
          this.listeners = {};
          for (const listener in this.windowListeners) {
            this.removeWindowListener(this.windowListeners[listener]);
          }
          this.windowListeners = {};
        }
        notifyListeners(eventName, data, retainUntilConsumed) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            if (retainUntilConsumed) {
              let args = this.retainedEventArguments[eventName];
              if (!args) {
                args = [];
              }
              args.push(data);
              this.retainedEventArguments[eventName] = args;
            }
            return;
          }
          listeners.forEach((listener) => listener(data));
        }
        hasListeners(eventName) {
          var _a;
          return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
        }
        registerWindowListener(windowEventName, pluginEventName) {
          this.windowListeners[pluginEventName] = {
            registered: false,
            windowEventName,
            pluginEventName,
            handler: (event) => {
              this.notifyListeners(pluginEventName, event);
            }
          };
        }
        unimplemented(msg = "not implemented") {
          return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
        }
        unavailable(msg = "not available") {
          return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
        }
        async removeListener(eventName, listenerFunc) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            return;
          }
          const index = listeners.indexOf(listenerFunc);
          if (index !== -1) {
            this.listeners[eventName].splice(index, 1);
          }
          if (!this.listeners[eventName].length) {
            this.removeWindowListener(this.windowListeners[eventName]);
          }
        }
        addWindowListener(handle) {
          window.addEventListener(handle.windowEventName, handle.handler);
          handle.registered = true;
        }
        removeWindowListener(handle) {
          if (!handle) {
            return;
          }
          window.removeEventListener(handle.windowEventName, handle.handler);
          handle.registered = false;
        }
        sendRetainedArgumentsForEvent(eventName) {
          const args = this.retainedEventArguments[eventName];
          if (!args) {
            return;
          }
          delete this.retainedEventArguments[eventName];
          args.forEach((arg) => {
            this.notifyListeners(eventName, arg);
          });
        }
      };
      encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
      decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
      CapacitorCookiesPluginWeb = class extends WebPlugin {
        async getCookies() {
          const cookies = document.cookie;
          const cookieMap = {};
          cookies.split(";").forEach((cookie) => {
            if (cookie.length <= 0)
              return;
            let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
            key = decode(key).trim();
            value = decode(value).trim();
            cookieMap[key] = value;
          });
          return cookieMap;
        }
        async setCookie(options) {
          try {
            const encodedKey = encode(options.key);
            const encodedValue = encode(options.value);
            const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
            const path = (options.path || "/").replace("path=", "");
            const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
            document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async deleteCookie(options) {
          try {
            document.cookie = `${options.key}=; Max-Age=0`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearCookies() {
          try {
            const cookies = document.cookie.split(";") || [];
            for (const cookie of cookies) {
              document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
            }
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearAllCookies() {
          try {
            await this.clearCookies();
          } catch (error) {
            return Promise.reject(error);
          }
        }
      };
      CapacitorCookies = registerPlugin("CapacitorCookies", {
        web: () => new CapacitorCookiesPluginWeb()
      });
      readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result;
          resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
      });
      normalizeHttpHeaders = (headers = {}) => {
        const originalKeys = Object.keys(headers);
        const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
        const normalized = loweredKeys.reduce((acc, key, index) => {
          acc[key] = headers[originalKeys[index]];
          return acc;
        }, {});
        return normalized;
      };
      buildUrlParams = (params, shouldEncode = true) => {
        if (!params)
          return null;
        const output = Object.entries(params).reduce((accumulator, entry) => {
          const [key, value] = entry;
          let encodedValue;
          let item;
          if (Array.isArray(value)) {
            item = "";
            value.forEach((str) => {
              encodedValue = shouldEncode ? encodeURIComponent(str) : str;
              item += `${key}=${encodedValue}&`;
            });
            item.slice(0, -1);
          } else {
            encodedValue = shouldEncode ? encodeURIComponent(value) : value;
            item = `${key}=${encodedValue}`;
          }
          return `${accumulator}&${item}`;
        }, "");
        return output.substr(1);
      };
      buildRequestInit = (options, extra = {}) => {
        const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
        const headers = normalizeHttpHeaders(options.headers);
        const type = headers["content-type"] || "";
        if (typeof options.data === "string") {
          output.body = options.data;
        } else if (type.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(options.data || {})) {
            params.set(key, value);
          }
          output.body = params.toString();
        } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
          const form = new FormData();
          if (options.data instanceof FormData) {
            options.data.forEach((value, key) => {
              form.append(key, value);
            });
          } else {
            for (const key of Object.keys(options.data)) {
              form.append(key, options.data[key]);
            }
          }
          output.body = form;
          const headers2 = new Headers(output.headers);
          headers2.delete("content-type");
          output.headers = headers2;
        } else if (type.includes("application/json") || typeof options.data === "object") {
          output.body = JSON.stringify(options.data);
        }
        return output;
      };
      CapacitorHttpPluginWeb = class extends WebPlugin {
        /**
         * Perform an Http request given a set of options
         * @param options Options to build the HTTP request
         */
        async request(options) {
          const requestInit = buildRequestInit(options, options.webFetchExtra);
          const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
          const url = urlParams ? `${options.url}?${urlParams}` : options.url;
          const response = await fetch(url, requestInit);
          const contentType = response.headers.get("content-type") || "";
          let { responseType = "text" } = response.ok ? options : {};
          if (contentType.includes("application/json")) {
            responseType = "json";
          }
          let data;
          let blob;
          switch (responseType) {
            case "arraybuffer":
            case "blob":
              blob = await response.blob();
              data = await readBlobAsBase64(blob);
              break;
            case "json":
              data = await response.json();
              break;
            case "document":
            case "text":
            default:
              data = await response.text();
          }
          const headers = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          return {
            data,
            headers,
            status: response.status,
            url: response.url
          };
        }
        /**
         * Perform an Http GET request given a set of options
         * @param options Options to build the HTTP request
         */
        async get(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
        }
        /**
         * Perform an Http POST request given a set of options
         * @param options Options to build the HTTP request
         */
        async post(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
        }
        /**
         * Perform an Http PUT request given a set of options
         * @param options Options to build the HTTP request
         */
        async put(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
        }
        /**
         * Perform an Http PATCH request given a set of options
         * @param options Options to build the HTTP request
         */
        async patch(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
        }
        /**
         * Perform an Http DELETE request given a set of options
         * @param options Options to build the HTTP request
         */
        async delete(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
        }
      };
      CapacitorHttp = registerPlugin("CapacitorHttp", {
        web: () => new CapacitorHttpPluginWeb()
      });
      (function(SystemBarsStyle2) {
        SystemBarsStyle2["Dark"] = "DARK";
        SystemBarsStyle2["Light"] = "LIGHT";
        SystemBarsStyle2["Default"] = "DEFAULT";
      })(SystemBarsStyle || (SystemBarsStyle = {}));
      (function(SystemBarType2) {
        SystemBarType2["StatusBar"] = "StatusBar";
        SystemBarType2["NavigationBar"] = "NavigationBar";
      })(SystemBarType || (SystemBarType = {}));
      SystemBarsPluginWeb = class extends WebPlugin {
        async setStyle() {
          this.unavailable("not available for web");
        }
        async setAnimation() {
          this.unavailable("not available for web");
        }
        async show() {
          this.unavailable("not available for web");
        }
        async hide() {
          this.unavailable("not available for web");
        }
      };
      SystemBars = registerPlugin("SystemBars", {
        web: () => new SystemBarsPluginWeb()
      });
    }
  });

  // node_modules/@capacitor/local-notifications/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    LocalNotificationsWeb: () => LocalNotificationsWeb
  });
  var LocalNotificationsWeb;
  var init_web = __esm({
    "node_modules/@capacitor/local-notifications/dist/esm/web.js"() {
      init_dist();
      LocalNotificationsWeb = class extends WebPlugin {
        constructor() {
          super(...arguments);
          this.pending = [];
          this.deliveredNotifications = [];
          this.hasNotificationSupport = () => {
            if (!("Notification" in window) || !Notification.requestPermission) {
              return false;
            }
            if (Notification.permission !== "granted") {
              try {
                new Notification("");
              } catch (e) {
                if (e instanceof Error && e.name === "TypeError") {
                  return false;
                }
              }
            }
            return true;
          };
        }
        async getDeliveredNotifications() {
          const deliveredSchemas = [];
          for (const notification of this.deliveredNotifications) {
            const deliveredSchema = {
              title: notification.title,
              id: parseInt(notification.tag),
              body: notification.body
            };
            deliveredSchemas.push(deliveredSchema);
          }
          return {
            notifications: deliveredSchemas
          };
        }
        async removeDeliveredNotifications(delivered) {
          for (const toRemove of delivered.notifications) {
            const found = this.deliveredNotifications.find((n) => n.tag === String(toRemove.id));
            found === null || found === void 0 ? void 0 : found.close();
            this.deliveredNotifications = this.deliveredNotifications.filter(() => !found);
          }
        }
        async removeDeliveredNotificationsById(options) {
          for (const id of options.ids) {
            const found = this.deliveredNotifications.find((n) => n.tag === String(id));
            found === null || found === void 0 ? void 0 : found.close();
            this.deliveredNotifications = this.deliveredNotifications.filter((n) => n !== found);
          }
        }
        async removeAllDeliveredNotifications() {
          for (const notification of this.deliveredNotifications) {
            notification.close();
          }
          this.deliveredNotifications = [];
        }
        async getByIds(options) {
          const ids = options.ids.map((id) => String(id));
          const scheduled = this.pending.filter((n) => ids.includes(String(n.id)));
          const delivered = this.deliveredNotifications.filter((n) => ids.includes(n.tag)).map((n) => this.deliveredToSchema(n));
          return { notifications: [...scheduled, ...delivered] };
        }
        async getAll(options) {
          const scheduled = [...this.pending];
          const delivered = this.deliveredNotifications.map((n) => this.deliveredToSchema(n));
          if ((options === null || options === void 0 ? void 0 : options.state) === "SCHEDULED") {
            return { notifications: scheduled };
          }
          if ((options === null || options === void 0 ? void 0 : options.state) === "TRIGGERED") {
            return { notifications: delivered };
          }
          return { notifications: [...scheduled, ...delivered] };
        }
        deliveredToSchema(notification) {
          return {
            title: notification.title,
            id: parseInt(notification.tag),
            body: notification.body
          };
        }
        async createChannel() {
          throw this.unimplemented("Not implemented on web.");
        }
        async deleteChannel() {
          throw this.unimplemented("Not implemented on web.");
        }
        async listChannels() {
          throw this.unimplemented("Not implemented on web.");
        }
        async schedule(options) {
          if (!this.hasNotificationSupport()) {
            throw this.unavailable("Notifications not supported in this browser.");
          }
          for (const notification of options.notifications) {
            this.sendNotification(notification);
          }
          return {
            notifications: options.notifications.map((notification) => ({
              id: notification.id
            }))
          };
        }
        async update(options) {
          if (!this.hasNotificationSupport()) {
            throw this.unavailable("Notifications not supported in this browser.");
          }
          const updated = [];
          for (const notification of options.notifications) {
            const index = this.pending.findIndex((n) => n.id === notification.id);
            if (index === -1) {
              continue;
            }
            this.pending.splice(index, 1);
            this.sendNotification(notification);
            updated.push(notification);
          }
          return {
            notifications: updated.map((notification) => ({ id: notification.id }))
          };
        }
        async getPending() {
          return {
            notifications: this.pending
          };
        }
        async cancelAll() {
          this.pending = [];
        }
        async registerActionTypes() {
          throw this.unimplemented("Not implemented on web.");
        }
        async cancel(pending) {
          this.pending = this.pending.filter((notification) => !pending.notifications.find((n) => n.id === notification.id));
        }
        async areEnabled() {
          const { display } = await this.checkPermissions();
          return {
            value: display === "granted"
          };
        }
        async changeExactNotificationSetting() {
          throw this.unimplemented("Not implemented on web.");
        }
        async checkExactNotificationSetting() {
          throw this.unimplemented("Not implemented on web.");
        }
        async requestPermissions() {
          if (!this.hasNotificationSupport()) {
            throw this.unavailable("Notifications not supported in this browser.");
          }
          const display = this.transformNotificationPermission(await Notification.requestPermission());
          return { display };
        }
        async checkPermissions() {
          if (!this.hasNotificationSupport()) {
            throw this.unavailable("Notifications not supported in this browser.");
          }
          const display = this.transformNotificationPermission(Notification.permission);
          return { display };
        }
        transformNotificationPermission(permission) {
          switch (permission) {
            case "granted":
              return "granted";
            case "denied":
              return "denied";
            default:
              return "prompt";
          }
        }
        sendPending() {
          var _a;
          const toRemove = [];
          const now = (/* @__PURE__ */ new Date()).getTime();
          for (const notification of this.pending) {
            if (((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) && notification.schedule.at.getTime() <= now) {
              this.buildNotification(notification);
              toRemove.push(notification);
            }
          }
          this.pending = this.pending.filter((notification) => !toRemove.find((n) => n === notification));
        }
        sendNotification(notification) {
          var _a;
          if ((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) {
            const diff = notification.schedule.at.getTime() - (/* @__PURE__ */ new Date()).getTime();
            this.pending.push(notification);
            setTimeout(() => {
              this.sendPending();
            }, diff);
            return;
          }
          this.buildNotification(notification);
        }
        buildNotification(notification) {
          const localNotification = new Notification(notification.title, {
            body: notification.body,
            tag: String(notification.id)
          });
          localNotification.addEventListener("click", this.onClick.bind(this, notification), false);
          localNotification.addEventListener("show", this.onShow.bind(this, notification), false);
          localNotification.addEventListener("close", () => {
            this.deliveredNotifications = this.deliveredNotifications.filter(() => !this);
          }, false);
          this.deliveredNotifications.push(localNotification);
          return localNotification;
        }
        onClick(notification) {
          const data = {
            actionId: "tap",
            notification
          };
          this.notifyListeners("localNotificationActionPerformed", data);
        }
        onShow(notification) {
          this.notifyListeners("localNotificationReceived", notification);
        }
      };
    }
  });

  // node_modules/@capacitor/app/dist/esm/web.js
  var web_exports2 = {};
  __export(web_exports2, {
    AppWeb: () => AppWeb
  });
  var AppWeb;
  var init_web2 = __esm({
    "node_modules/@capacitor/app/dist/esm/web.js"() {
      init_dist();
      AppWeb = class extends WebPlugin {
        constructor() {
          super();
          this.handleVisibilityChange = () => {
            const data = {
              isActive: document.hidden !== true
            };
            this.notifyListeners("appStateChange", data);
            if (document.hidden) {
              this.notifyListeners("pause", null);
            } else {
              this.notifyListeners("resume", null);
            }
          };
          document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
        }
        exitApp() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getInfo() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getLaunchUrl() {
          return { url: "" };
        }
        async getState() {
          return { isActive: document.hidden !== true };
        }
        async minimizeApp() {
          throw this.unimplemented("Not implemented on web.");
        }
        async toggleBackButtonHandler() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getAppLanguage() {
          return {
            value: navigator.language.split("-")[0].toLowerCase()
          };
        }
      };
    }
  });

  // src/app.js
  init_dist();

  // node_modules/@capacitor/local-notifications/dist/esm/index.js
  init_dist();

  // node_modules/@capacitor/local-notifications/dist/esm/definitions.js
  var Weekday;
  (function(Weekday2) {
    Weekday2[Weekday2["Sunday"] = 1] = "Sunday";
    Weekday2[Weekday2["Monday"] = 2] = "Monday";
    Weekday2[Weekday2["Tuesday"] = 3] = "Tuesday";
    Weekday2[Weekday2["Wednesday"] = 4] = "Wednesday";
    Weekday2[Weekday2["Thursday"] = 5] = "Thursday";
    Weekday2[Weekday2["Friday"] = 6] = "Friday";
    Weekday2[Weekday2["Saturday"] = 7] = "Saturday";
  })(Weekday || (Weekday = {}));

  // node_modules/@capacitor/local-notifications/dist/esm/index.js
  var LocalNotifications = registerPlugin("LocalNotifications", {
    web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.LocalNotificationsWeb())
  });

  // node_modules/@capacitor/app/dist/esm/index.js
  init_dist();
  var App = registerPlugin("App", {
    web: () => Promise.resolve().then(() => (init_web2(), web_exports2)).then((m) => new m.AppWeb())
  });

  // src/logic.js
  var MIN = 6e4;
  var DAY = 864e5;
  var DAYS = {
    sun: 0,
    sunday: 0,
    mon: 1,
    monday: 1,
    tue: 2,
    tues: 2,
    tuesday: 2,
    wed: 3,
    wednesday: 3,
    thu: 4,
    thur: 4,
    thurs: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6
  };
  var DAYNAME = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function startOfDay(ms) {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  function atTime(dayMs, h, m) {
    const d = new Date(dayMs);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }
  function addDays(ms, n) {
    const d = new Date(ms);
    d.setDate(d.getDate() + n);
    return d.getTime();
  }
  function dayKey(ms) {
    const d = new Date(ms);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function addMonthsAnchored(startMs, n) {
    const s = new Date(startMs);
    const y = s.getFullYear(), m = s.getMonth() + n;
    const last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(s.getDate(), last), s.getHours(), s.getMinutes(), 0, 0).getTime();
  }
  function fmtTime(ms) {
    const d = new Date(ms);
    let h = d.getHours();
    const m = d.getMinutes();
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + String(m).padStart(2, "0") + " " + ap;
  }
  function fmtDay(ms, now) {
    now = now || Date.now();
    const d0 = startOfDay(now), d = startOfDay(ms);
    if (d === d0) return "Today";
    if (d === addDays(d0, 1)) return "Tomorrow";
    if (d === addDays(d0, -1)) return "Yesterday";
    const x = new Date(ms);
    const y = x.getFullYear() !== new Date(now).getFullYear() ? " " + x.getFullYear() : "";
    return DAYNAME[x.getDay()] + " " + x.getDate() + " " + MON[x.getMonth()] + y;
  }
  function fmtWhen(ms, now) {
    return fmtDay(ms, now) + ", " + fmtTime(ms);
  }
  function fmtDate(ms, now) {
    return fmtDay(ms, now);
  }
  function repeatLabel(rem) {
    const r = rem.repeat || "";
    if (!r) return "";
    const s = new Date(rem.start || rem.due);
    if (r === "daily") return "Every day";
    if (r === "weekly") return "Every " + DAYNAME[s.getDay()];
    if (r === "monthly") return "Every month on " + ordinal(s.getDate());
    if (r === "yearly") return "Every year on " + s.getDate() + " " + MON[s.getMonth()];
    const n = Number(r.split(":")[1]);
    return n % 60 === 0 ? "Every " + (n === 60 ? "hour" : n / 60 + " hours") : "Every " + n + " min";
  }
  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function occurrence(rem, k) {
    const r = rem.repeat, s = rem.start || rem.due;
    if (r === "daily") return addDays(s, k);
    if (r === "weekly") return addDays(s, 7 * k);
    if (r === "monthly") return addMonthsAnchored(s, k);
    if (r === "yearly") return addMonthsAnchored(s, 12 * k);
    if (r && r.indexOf("every:") === 0) return s + k * Number(r.split(":")[1]) * MIN;
    return s;
  }
  function approxStep(rem) {
    const r = rem.repeat;
    if (r === "daily") return DAY;
    if (r === "weekly") return 7 * DAY;
    if (r === "monthly") return 28 * DAY;
    if (r === "yearly") return 365 * DAY;
    return Number(r.split(":")[1]) * MIN;
  }
  function nextAfter(rem, t) {
    if (!rem.repeat) return null;
    const s = rem.start || rem.due;
    let k;
    if (rem.repeat === "monthly" || rem.repeat === "yearly") {
      const a = new Date(s), b = new Date(t);
      const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
      k = Math.max(0, (rem.repeat === "monthly" ? months : Math.floor(months / 12)) - 1);
    } else {
      k = Math.max(0, Math.floor((t - s) / approxStep(rem)) - 2);
    }
    let o = occurrence(rem, k);
    let guard = 0;
    while (o <= t && guard++ < 5e3) o = occurrence(rem, ++k);
    return o;
  }
  function occurrencesBetween(rem, from, to, limit) {
    limit = limit || 200;
    if (!rem.repeat) return rem.due >= from && rem.due < to ? [rem.due] : [];
    const out = [];
    let o = rem.due >= from ? rem.due : nextAfter(rem, from - 1);
    let guard = 0;
    while (o < to && out.length < limit && guard++ < 5e3) {
      if (o >= from) out.push(o);
      o = nextAfter(rem, o);
    }
    return out;
  }
  var CATS = ["Work", "Follow-up", "Meeting", "Money", "Family", "Health", "Home", "Documents", "Personal"];
  var CAT_EMOJI = {
    Work: "\u{1F4BC}",
    "Follow-up": "\u{1F4DE}",
    Meeting: "\u{1F91D}",
    Money: "\u{1F4B0}",
    Family: "\u2764\uFE0F",
    Health: "\u{1F4AA}",
    Home: "\u{1F3E0}",
    Documents: "\u{1F4C4}",
    Personal: "\u2728"
  };
  function taskEmoji(task, cat) {
    const t = String(task || "").toLowerCase();
    if (/water|paani|pani/.test(t)) return "\u{1F4A7}";
    if (/stand|stretch/.test(t)) return "\u{1F9CD}";
    if (/gym|workout/.test(t)) return "\u{1F3CB}\uFE0F";
    if (/walk/.test(t)) return "\u{1F6B6}";
    if (/medicine|pill|tablet/.test(t)) return "\u{1F48A}";
    if (/birthday/.test(t)) return "\u{1F382}";
    if (/anniversary/.test(t)) return "\u{1F490}";
    if (/shoot/.test(t)) return "\u{1F3A5}";
    return CAT_EMOJI[cat] || "\u2728";
  }
  function guessCategory(task) {
    const t = " " + task.toLowerCase() + " ";
    if (/follow ?up|followup|remind (him|her|them)|reply to|check with/.test(t)) return "Follow-up";
    if (/meeting|meet |call with|zoom|google meet|presentation|pitch/.test(t)) return "Meeting";
    if (/ pay |payment|bill|emi|rent|invoice|sip|salary|gst payment|recharge|collect|₹|rs\.? ?\d/.test(t)) return "Money";
    if (/insurance|puc|car service|bike service|service the car|cylinder|gas booking|broadband|wifi|electricity|plumber|ac service/.test(t)) return "Home";
    if (/passport|licen[cs]e|gst|itr|tax|aadhaar|aadhar|pan card|document|renewal/.test(t)) return "Documents";
    if (/gym|water|walk|workout|stretch|stand up|meditat|yoga|medicine|pill|doctor|protein|run |sleep/.test(t)) return "Health";
    if (/mummy|mom |mother|papa|dad |father|devanshi|wife|bro|sister|family|birthday|anniversary|nana|nani|dada|dadi/.test(t)) return "Family";
    if (/shoot|edit|reel|client|quotation|quote|deliver|render|post |design|logo|proposal|script/.test(t)) return "Work";
    return "Personal";
  }
  function parseReminder(text, now) {
    now = now || Date.now();
    let s = String(text || "").trim().replace(/\s+/g, " ");
    s = s.replace(/^(hey |ok |okay )?lucy[,:]? ?/i, "").replace(/^(please |pls |plz )/i, "").replace(/^remind me( to| about| that)? /i, "");
    let m, t;
    if (m = s.match(/^in (\d+) ?(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\b,? (?:to )?(.+)$/i)) {
      return mk(m[3], now + toMin(m[1], m[2]) * MIN, "");
    }
    if (m = s.match(/^every (\d+)? ?(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\b,? (?:to )?(.+)$/i)) {
      const n = toMin(m[1] || 1, m[2]);
      if (n < 5) return null;
      return mk(m[3], now + n * MIN, "every:" + n);
    }
    if (m = s.match(/^(?:every ?day|daily|roj|rozana|roz) (.+)$/i)) {
      if (!(t = takeTime(m[1]))) return null;
      let due2 = atTime(now, t.h, t.min);
      if (due2 <= now) due2 = addDays(due2, 1);
      return mk(t.rest, due2, "daily");
    }
    if (m = s.match(/^(?:every month|monthly|har mahine|every)(?: on)?(?: the)? (\d{1,2})(?:st|nd|rd|th)?\b,? (.+)$/i)) {
      const dd = +m[1];
      if (dd < 1 || dd > 31) return null;
      t = takeTime(m[2]) || { h: 10, min: 0, rest: m[2].replace(/^(at|on)\s+/i, "") };
      const n = new Date(now);
      let start2 = new Date(n.getFullYear(), n.getMonth(), Math.min(dd, daysIn(n.getFullYear(), n.getMonth())), t.h, t.min).getTime();
      if (start2 <= now) start2 = new Date(n.getFullYear(), n.getMonth() + 1, Math.min(dd, daysIn(n.getFullYear(), n.getMonth() + 1)), t.h, t.min).getTime();
      const anchor = dd > 28 ? new Date(2e3, 0, dd, t.h, t.min).getTime() : start2;
      const r = mk(t.rest, start2, "monthly");
      if (r && dd > 28) {
        r.start = anchor;
        r.due = nextAfter(r, now);
      }
      return r;
    }
    if (m = s.match(/^(?:every year|yearly|annually|har saal)(?: on)? (\d{1,2})[\/\-](\d{1,2})\b,? (.+)$/i)) {
      const dd = +m[1], mo = +m[2] - 1;
      if (dd < 1 || dd > 31 || mo < 0 || mo > 11) return null;
      t = takeTime(m[3]) || { h: 9, min: 0, rest: m[3].replace(/^(at|on)\s+/i, "") };
      const y = new Date(now).getFullYear();
      let due2 = new Date(y, mo, dd, t.h, t.min).getTime();
      if (due2 <= now) due2 = new Date(y + 1, mo, dd, t.h, t.min).getTime();
      return mk(t.rest, due2, "yearly");
    }
    if ((m = s.match(/^every ([a-z]+) (.+)$/i)) && DAYS[m[1].toLowerCase()] !== void 0) {
      t = takeTime(m[2]) || { h: 9, min: 0, rest: m[2] };
      return mk(t.rest, dowDue(now, DAYS[m[1].toLowerCase()], t), "weekly");
    }
    let d = takeDay(s);
    t = takeTime(d.rest);
    if (t && !hasDay(d)) {
      const d2 = takeDay(t.rest);
      if (hasDay(d2)) {
        d = d2;
        t.rest = d2.rest;
      }
    }
    if (!t) {
      const a = findAnywhere(s);
      if (a) {
        d = a.d;
        t = a.t;
      } else if (hasDay(d)) t = { h: 9, min: 0, rest: d.rest };
      else return null;
    }
    let due;
    if (d.offset !== void 0) {
      due = atTime(addDays(startOfDay(now), d.offset), t.h, t.min);
    } else if (d.dow !== void 0) {
      due = dowDue(now, d.dow, t);
    } else if (d.date) {
      const y = new Date(now).getFullYear();
      due = new Date(d.date.y || y, d.date.m, d.date.d, t.h, t.min).getTime();
      if (!d.date.y && due <= now) due = new Date(y + 1, d.date.m, d.date.d, t.h, t.min).getTime();
    } else {
      due = atTime(now, t.h, t.min);
      if (due <= now) due = addDays(due, 1);
    }
    return mk(t.rest, due, "");
  }
  function mk(raw, due, repeat) {
    let task = String(raw || "").replace(/^(to |-|,|:)\s*/i, "").replace(/\s+(at|on|by)$/i, "").trim();
    if (!task) return null;
    task = task.charAt(0).toUpperCase() + task.slice(1);
    return { task, due, start: due, repeat, cat: guessCategory(task) };
  }
  function daysIn(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }
  function toMin(n, unit) {
    return /^h/i.test(unit) ? +n * 60 : +n;
  }
  function hasDay(d) {
    return d.offset !== void 0 || d.dow !== void 0 || !!d.date;
  }
  function dowDue(now, dow, t) {
    const today = new Date(now).getDay();
    let due = atTime(addDays(startOfDay(now), (dow - today + 7) % 7), t.h, t.min);
    if (due <= now) due = addDays(due, 7);
    return due;
  }
  function takeDay(str) {
    let m;
    if (m = str.match(/^(day after tomorrow|parso|parson)\b,? ?(.*)$/i)) return { offset: 2, rest: m[2] };
    if (m = str.match(/^(today|aaj|tonight)\b,? ?(.*)$/i)) return { offset: 0, rest: m[2] };
    if (m = str.match(/^(tomorrow|tomorow|tmrw|tmr|kal)\b,? ?(.*)$/i)) return { offset: 1, rest: m[2] };
    if ((m = str.match(/^(?:on |this |next )?([a-z]+)\b,? ?(.*)$/i)) && DAYS[m[1].toLowerCase()] !== void 0) {
      return { dow: DAYS[m[1].toLowerCase()], rest: m[2] };
    }
    if (m = str.match(/^(?:on )?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b,? ?(.*)$/)) {
      const dd = +m[1], mo = +m[2] - 1;
      let y = m[3] ? +m[3] : 0;
      if (y && y < 100) y += 2e3;
      if (dd >= 1 && dd <= 31 && mo >= 0 && mo <= 11) return { date: { d: dd, m: mo, y }, rest: m[4] };
    }
    return { rest: str };
  }
  function findAnywhere(s) {
    const timeRe = /(?:^|\s)(?:at\s+|@\s*|by\s+)?(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)(?![a-z])|\d{1,2}[:.]\d{2}(?!\d)|\d{1,2} ?baje\b)/i;
    const dayRe = /(?:^|\s)(day after tomorrow|parso|parson|today|aaj|tonight|tomorrow|tomorow|tmrw|tmr|kal|(?:on |this |next )?(?:sun|sunday|mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)|(?:on )?\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)(?=\s|$|,)/i;
    let rest = s, t = null;
    const tm = s.match(timeRe);
    if (tm) {
      t = takeTime(tm[1]);
      if (!t) return null;
      rest = cut(s, tm.index, tm[0].length);
    }
    const dm = rest.match(dayRe);
    let d = { rest: "" };
    if (dm) {
      d = takeDay(dm[1].trim());
      rest = cut(rest, dm.index, dm[0].length);
    }
    if (!t && !hasDay(d)) return null;
    if (!t) t = { h: 9, min: 0 };
    t.rest = rest.replace(/\s+(at|on|by)$/i, "");
    return { t, d };
  }
  function cut(s, i, len) {
    return (s.slice(0, i) + " " + s.slice(i + len)).replace(/\s+/g, " ").trim();
  }
  function takeTime(str) {
    str = str.replace(/^(at|@|by)\s+/i, "");
    let m = str.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?![a-z])\s*,?\s*(.*)$/i);
    if (m) {
      let h = +m[1];
      const mi = +(m[2] || 0);
      if (h < 1 || h > 12 || mi > 59) return null;
      if (h === 12) h = 0;
      if (/^p/i.test(m[3])) h += 12;
      return { h, min: mi, rest: m[4] };
    }
    m = str.match(/^(\d{1,2})[:.](\d{2})(?!\d)\s*,?\s*(.*)$/);
    if (m) {
      if (+m[1] > 23 || +m[2] > 59) return null;
      return { h: +m[1], min: +m[2], rest: m[3] };
    }
    m = str.match(/^(\d{1,2}) ?baje\b\s*,?\s*(.*)$/i);
    if (m) {
      let h = +m[1];
      if (h < 1 || h > 12) return null;
      if (h <= 7) h += 12;
      return { h, min: 0, rest: m[2] };
    }
    m = str.match(/^(morning|subah|afternoon|dopahar|evening|shaam|sham|night|raat)\b\s*,?\s*(.*)$/i);
    if (m) {
      const w = m[1].toLowerCase();
      const h = /morn|subah/.test(w) ? 9 : /after|dopahar/.test(w) ? 14 : /even|sha/.test(w) ? 18 : 21;
      return { h, min: 0, rest: m[2] };
    }
    return null;
  }
  function greeting(name2, now) {
    const h = new Date(now || Date.now()).getHours();
    const g = h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good night";
    return g + ", " + name2;
  }
  function nagText(name2, task, k, max) {
    if (k === 0) return { title: "\u23F0 " + task, body: "Hey " + name2 + ", it's time." };
    if (k === 1) return { title: "\u{1F514} Still pending: " + task, body: "Just a nudge. Tap Done when it's finished." };
    if (k === 2) return { title: "\u{1F440} " + name2 + ", " + task, body: "I'm going to keep asking \u{1F642}" };
    if (k === max) return { title: "\u{1F64F} Last reminder: " + task, body: "I'll stop now. Trusting you on this one." };
    if (k >= 5) return { title: "\u{1F624} Reminder #" + (k + 1) + ": " + task, body: name2 + ", seriously. Two minutes and it's done." };
    return { title: "\u{1F605} " + ordinal(k + 1) + " time: " + task, body: "Done yet? Or shall I snooze it?" };
  }
  function cheer(count) {
    const lines = ["Nice! \u2705", "Done and dusted \u2728", "That's how it's done \u{1F4AA}", "One less thing on your mind \u{1F64C}", "Boss move \u{1F60E}"];
    return lines[count % lines.length];
  }
  function money(n) {
    n = Math.round(Number(n) || 0);
    const s = String(Math.abs(n));
    const last3 = s.slice(-3), rest = s.slice(0, -3);
    return (n < 0 ? "-" : "") + "\u20B9" + (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") + last3;
  }

  // src/app.js
  var NATIVE = Capacitor.isNativePlatform();
  var KEY = "lucy.data.v1";
  var DEFAULTS = {
    settings: {
      name: "Divyesh",
      nagMin: 15,
      maxNags: 8,
      snoozeMin: 10,
      briefTime: "08:30",
      top3Checks: true,
      journalTime: "21:30",
      reviewDay: 0,
      reviewTime: "19:00",
      quietStart: "22:30",
      quietEnd: "08:00"
    },
    reminders: [],
    clients: [],
    payments: [],
    notes: [],
    shopping: [],
    learning: [],
    top3: { date: "", items: [] },
    journal: {},
    log: [],
    seq: 1,
    onboarded: false,
    hideTips: {}
  };
  var S = load();
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "null");
      if (d) {
        const out = Object.assign(clone(DEFAULTS), d);
        out.settings = Object.assign(clone(DEFAULTS.settings), d.settings || {});
        return out;
      }
    } catch (e) {
      console.error(e);
    }
    return clone(DEFAULTS);
  }
  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }
  function save(noSync) {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      toast("Could not save \u{1F61F}");
    }
    if (!noSync) scheduleSync();
  }
  function nid() {
    return S.seq++;
  }
  function logEvent(kind, rem, extra) {
    S.log.push(Object.assign({ t: Date.now(), kind, task: rem ? rem.task : "", cat: rem ? rem.cat : "" }, extra || {}));
    if (S.log.length > 1500) S.log = S.log.slice(-1200);
  }
  var $ = (s) => document.querySelector(s);
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function hm(str) {
    const p = String(str || "0:0").split(":");
    return { h: +p[0] || 0, m: +p[1] || 0 };
  }
  function toDateInput(ms) {
    return dayKey(ms);
  }
  function toTimeInput(ms) {
    const d = new Date(ms);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function fromInputs(dateStr, timeStr) {
    const [y, mo, d] = String(dateStr).split("-").map(Number);
    const t = hm(timeStr || "09:00");
    return new Date(y, (mo || 1) - 1, d || 1, t.h, t.m, 0, 0).getTime();
  }
  var toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.hidden = true;
    }, 2400);
  }
  var name = () => S.settings.name || "there";
  var clientById = (id) => S.clients.find((c) => c.id === Number(id));
  var remById = (id) => S.reminders.find((r) => r.id === Number(id));
  var payById = (id) => S.payments.find((p) => p.id === Number(id));
  var isHabit = (r) => (r.repeat || "").indexOf("every:") === 0;
  var isCal = (r) => ["daily", "weekly", "monthly", "yearly"].includes(r.repeat);
  var alertStart = (r) => Math.max(r.due, r.snoozeUntil || 0);
  var nagEnd = (r) => alertStart(r) + S.settings.maxNags * S.settings.nagMin * MIN;
  function inQuiet(ms) {
    const d = new Date(ms), mins = d.getHours() * 60 + d.getMinutes();
    const a = hm(S.settings.quietStart), b = hm(S.settings.quietEnd);
    const qs = a.h * 60 + a.m, qe = b.h * 60 + b.m;
    return qs > qe ? mins >= qs || mins < qe : mins >= qs && mins < qe;
  }
  function doneToday() {
    const d0 = startOfDay(Date.now());
    return S.log.filter((e) => e.kind === "done" && e.t >= d0).length;
  }
  function streak() {
    const days = new Set(S.log.filter((e) => e.kind === "done").map((e) => dayKey(e.t)));
    let n = 0, d = Date.now();
    if (!days.has(dayKey(d))) d = addDays(d, -1);
    while (days.has(dayKey(d))) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  }
  function addReminder(r) {
    const rem = {
      id: nid(),
      task: r.task,
      cat: r.cat || guessCategory(r.task),
      due: r.due,
      start: r.start || r.due,
      repeat: r.repeat || "",
      status: "pending",
      clientId: r.clientId || null,
      created: Date.now(),
      snoozeUntil: 0
    };
    S.reminders.push(rem);
    save();
    return rem;
  }
  function markDone(id) {
    const r = remById(id);
    if (!r || r.status !== "pending") return;
    logEvent("done", r);
    if (isHabit(r)) {
      save();
      toast(cheer(doneToday()));
      return;
    }
    if (r.repeat) {
      r.due = nextAfter(r, Math.max(r.due, Date.now()));
      r.snoozeUntil = 0;
      toast(cheer(doneToday()) + " Next: " + fmtWhen(r.due));
    } else {
      r.status = "done";
      r.doneAt = Date.now();
      toast(cheer(doneToday()));
    }
    clearDelivered("rem", r.id);
    save();
  }
  function undoDone(id) {
    const r = remById(id);
    if (!r || r.status !== "done") return;
    r.status = "pending";
    r.doneAt = 0;
    for (let i = S.log.length - 1; i >= 0; i--) {
      if (S.log[i].kind === "done" && S.log[i].task === r.task) {
        S.log.splice(i, 1);
        break;
      }
    }
    save();
  }
  function snooze(id, minutes) {
    const r = remById(id);
    if (!r) return;
    r.snoozeUntil = Date.now() + minutes * MIN;
    clearDelivered("rem", r.id);
    save();
    toast("\u{1F634} Snoozed till " + fmtTime(r.snoozeUntil));
  }
  function deleteReminder(id) {
    S.reminders = S.reminders.filter((r) => r.id !== Number(id));
    clearDelivered("rem", Number(id));
    save();
  }
  function normalize() {
    const now = Date.now();
    let changed = false;
    S.reminders.forEach((r) => {
      if (r.status !== "pending" || !r.repeat) return;
      if (isHabit(r) && r.due <= now) {
        r.due = nextAfter(r, now);
        changed = true;
        return;
      }
      if (isCal(r) && nagEnd(r) < now) {
        logEvent("missed", r);
        r.due = nextAfter(r, now);
        r.snoozeUntil = 0;
        changed = true;
      }
    });
    const today = dayKey(now);
    if (S.top3.date !== today) {
      const carry = (S.top3.items || []).filter((i) => i.text && !i.done).map((i) => ({ text: i.text, done: false }));
      S.top3 = { date: today, items: carry.slice(0, 3) };
      changed = true;
    }
    if (changed) save(true);
  }
  function settlePayment(id) {
    const p = payById(id);
    if (!p) return;
    p.status = "settled";
    p.settledAt = Date.now();
    logEvent("paid", null, { task: (p.type === "in" ? "Received " : "Paid ") + money(p.amount) + (p.type === "in" ? " from " : " to ") + p.party, cat: "Money", amount: p.amount, dir: p.type });
    clearDelivered("pay", p.id);
    save();
    toast(p.type === "in" ? "\u{1F4B0} Money in! " + money(p.amount) : "\u2705 Paid " + money(p.amount));
  }
  var syncTimer;
  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, 700);
  }
  var syncing = false;
  var syncAgain = false;
  async function sync() {
    if (!NATIVE) return;
    if (syncing) {
      syncAgain = true;
      return;
    }
    syncing = true;
    try {
      normalize();
      const pend = await LocalNotifications.getPending();
      if (pend.notifications.length) await LocalNotifications.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
      const list = buildSchedule();
      if (list.length) {
        const exact = await exactAllowed();
        list.forEach((n) => {
          n.isExactNotification = exact;
        });
        await LocalNotifications.schedule({ notifications: list });
      }
    } catch (e) {
      console.error("sync failed", e);
    }
    syncing = false;
    if (syncAgain) {
      syncAgain = false;
      sync();
    }
  }
  async function exactAllowed() {
    try {
      const r = await LocalNotifications.checkExactNotificationSetting();
      return r.exact_alarm === "granted";
    } catch (e) {
      return true;
    }
  }
  function buildSchedule() {
    const st = S.settings, now = Date.now(), horizon = addDays(now, 7);
    const out = [];
    const push = (at, title, body, extra, type) => {
      if (at <= now + 2e3 || at > horizon) return;
      out.push({ at, title, body, extra, type });
    };
    S.reminders.forEach((r) => {
      if (r.status !== "pending") return;
      const client = r.clientId ? clientById(r.clientId) : null;
      const who = client ? " \xB7 " + client.name : "";
      if (isHabit(r)) {
        occurrencesBetween(r, now, addDays(now, 2), 80).forEach((o) => {
          if (!inQuiet(o)) push(o, taskEmoji(r.task, r.cat) + " " + r.task, "Tap \u{1F44D} when done", { kind: "habit", rid: r.id }, "HABIT");
        });
        return;
      }
      const start2 = alertStart(r);
      const next = r.repeat ? nextAfter(r, r.due) : Infinity;
      for (let k = 0; k <= st.maxNags; k++) {
        const t = start2 + k * st.nagMin * MIN;
        if (t >= next) break;
        const n = nagText(name(), r.task + who, k, st.maxNags);
        push(t, n.title, n.body, { kind: "rem", rid: r.id }, "REMIND");
      }
      if (r.repeat) {
        occurrencesBetween(r, r.due + 1, horizon, 30).forEach((o) => {
          const n = nagText(name(), r.task + who, 0, st.maxNags);
          push(o, n.title, n.body, { kind: "rem", rid: r.id }, "REMIND");
        });
      }
      if (r.cat === "Meeting" && client && client.notes) {
        push(start2 - 30 * MIN, "\u{1F91D} In 30 min: " + r.task, client.notes.slice(0, 220), { kind: "client", cid: client.id }, null);
      }
    });
    S.payments.forEach((p) => {
      if (p.status !== "pending") return;
      const verb = p.type === "in" ? "Collect " + money(p.amount) + " from " + p.party : "Pay " + money(p.amount) + " to " + p.party;
      const from = Math.max(p.snoozeUntil || 0, 0);
      const dayBefore = atTime(addDays(p.due, -1), 19, 0);
      if (dayBefore >= from) push(dayBefore, "\u{1F4B0} Tomorrow: " + verb, p.note || "Heads-up from Lucy", { kind: "pay", pid: p.id }, null);
      for (let i = 0; i < 7; i++) {
        const t = atTime(addDays(p.due, i), 10, 0);
        if (t < from) continue;
        push(t, i === 0 ? "\u{1F4B0} Today: " + verb : "\u26A0\uFE0F Overdue " + i + "d: " + verb, p.note || (p.type === "in" ? "Time to follow up \u{1F4DE}" : "Don't let it slip"), { kind: "pay", pid: p.id }, "PAY");
      }
    });
    for (let i = 0; i < 7; i++) {
      const day = addDays(startOfDay(now), i);
      const b = hm(st.briefTime);
      push(atTime(day, b.h, b.m), "\u2600\uFE0F " + greeting(name(), atTime(day, b.h, b.m)), briefText(day), { kind: "open", tab: "today" }, null);
      if (st.top3Checks) {
        [14, 18].forEach((h) => push(atTime(day, h, 0), "\u{1F3AF} Top 3 check-in", h === 14 ? "Halfway through the day. How are your 3 priorities going?" : "Evening check: tick off your Top 3 before the day ends.", { kind: "open", tab: "today" }, null));
      }
      const j = hm(st.journalTime);
      push(atTime(day, j.h, j.m), "\u{1F319} 2-minute reflection", "What went well today? What will you do better tomorrow?", { kind: "open", tab: "more", sub: "journal" }, null);
      if (new Date(day).getDay() === Number(st.reviewDay)) {
        const rv = hm(st.reviewTime);
        push(atTime(day, rv.h, rv.m), "\u{1F4CA} Your weekly review is ready", "See what you finished, what slipped, and plan next week.", { kind: "open", tab: "more", sub: "review" }, null);
      }
    }
    out.sort((a, b) => a.at - b.at);
    return out.slice(0, 400).map((n, i) => {
      const o = {
        id: i + 1,
        title: n.title,
        body: n.body,
        extra: n.extra,
        channelId: "lucy",
        schedule: { at: new Date(n.at), allowWhileIdle: true },
        smallIcon: "ic_stat_lucy",
        iconColor: "#FF5A6E",
        autoCancel: true
      };
      if (n.type) o.actionTypeId = n.type;
      return o;
    });
  }
  function briefText(day) {
    const end = addDays(day, 1);
    const rems = [];
    S.reminders.forEach((r) => {
      if (r.status !== "pending" || isHabit(r)) return;
      if (occurrencesBetween(r, day, end, 5).length) rems.push(r);
    });
    const pays = S.payments.filter((p) => p.status === "pending" && p.due < end);
    const collect = pays.filter((p) => p.type === "in").reduce((a, p) => a + Number(p.amount), 0);
    const pay = pays.filter((p) => p.type === "out").reduce((a, p) => a + Number(p.amount), 0);
    const parts = [];
    if (rems.length) parts.push(rems.length + " reminder" + (rems.length > 1 ? "s" : "") + ": " + rems.slice(0, 3).map((r) => r.task).join(", ") + (rems.length > 3 ? "\u2026" : ""));
    if (collect) parts.push(money(collect) + " to collect");
    if (pay) parts.push(money(pay) + " to pay");
    parts.push("Set your Top 3 \u{1F3AF}");
    return parts.join(" \u2022 ");
  }
  async function clearDelivered(kind, id) {
    if (!NATIVE) return;
    try {
      const d = await LocalNotifications.getDeliveredNotifications();
      const key = kind === "pay" ? "pid" : "rid";
      const hit = d.notifications.filter((n) => n.extra && Number(n.extra[key]) === Number(id) && (n.extra.kind === kind || kind === "rem" && n.extra.kind === "habit"));
      if (hit.length) await LocalNotifications.removeDeliveredNotifications({ notifications: hit });
    } catch (e) {
    }
  }
  function onAction(a) {
    const ex = a.notification && a.notification.extra || {};
    if (ex.kind === "rem" || ex.kind === "habit") {
      if (a.actionId === "done") markDone(ex.rid);
      else if (a.actionId === "snooze") snooze(ex.rid, S.settings.snoozeMin);
      else go("today");
    } else if (ex.kind === "pay") {
      const p = payById(ex.pid);
      if (a.actionId === "done") settlePayment(ex.pid);
      else if (a.actionId === "snooze" && p) {
        p.snoozeUntil = startOfDay(addDays(Date.now(), 1));
        save();
        toast("Okay, I'll remind you tomorrow");
      } else go("money");
    } else if (ex.kind === "client") {
      go("clients", null, ex.cid);
    } else if (ex.kind === "open") {
      go(ex.tab || "today", ex.sub || null);
    }
    render();
  }
  var perm = { notif: "granted", exact: "granted" };
  async function initNative() {
    if (!NATIVE) return;
    try {
      await LocalNotifications.createChannel({ id: "lucy", name: "Lucy reminders", description: "Reminders, nudges and briefings", importance: 5, visibility: 1, vibration: true, lights: true, lightColor: "#FF5A6E" });
      await LocalNotifications.registerActionTypes({ types: [
        { id: "REMIND", actions: [{ id: "done", title: "\u2705 Done" }, { id: "snooze", title: "\u23F0 Snooze " + S.settings.snoozeMin + "m" }] },
        { id: "HABIT", actions: [{ id: "done", title: "\u{1F44D} Done" }] },
        { id: "PAY", actions: [{ id: "done", title: "\u2705 Settled" }, { id: "snooze", title: "\u23F0 Tomorrow" }] }
      ] });
      LocalNotifications.addListener("localNotificationActionPerformed", onAction);
      App.addListener("resume", () => {
        normalize();
        refreshPerms();
        render();
        scheduleSync();
      });
      App.addListener("backButton", () => {
        if (!$("#sheet-wrap").hidden) return closeSheet();
        if (view.sub || view.clientId) {
          view.sub = null;
          view.clientId = null;
          return render();
        }
        if (view.tab !== "today") return go("today");
        App.minimizeApp();
      });
      await refreshPerms();
      if (perm.notif !== "granted" && S.onboarded) await LocalNotifications.requestPermissions();
    } catch (e) {
      console.error(e);
    }
  }
  async function refreshPerms() {
    if (!NATIVE) return;
    try {
      perm.notif = (await LocalNotifications.checkPermissions()).display;
    } catch (e) {
    }
    perm.exact = await exactAllowed() ? "granted" : "denied";
  }
  var view = { tab: "today", sub: null, clientId: null, filter: "All", moneyTab: "in", noteQ: "" };
  function go(tab, sub, clientId) {
    view.tab = tab;
    view.sub = sub || null;
    view.clientId = clientId ? Number(clientId) : null;
    closeSheet();
    render();
    window.scrollTo(0, 0);
  }
  function render() {
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.v === view.tab));
    const screens = { today: renderToday, reminders: renderReminders, clients: renderClients, money: renderMoney, more: renderMore };
    $("#app").innerHTML = (screens[view.tab] || renderToday)();
    const fab = !["more"].includes(view.tab) || ["notes", "shopping", "learning"].includes(view.sub);
    if (fab && !$(".fab")) document.body.insertAdjacentHTML("beforeend", '<button class="fab" data-a="fab">+</button>');
    if (!fab && $(".fab")) $(".fab").remove();
    if (view.tab === "today") updatePreview();
  }
  function remRow(r, opts) {
    opts = opts || {};
    const now = Date.now();
    const client = r.clientId ? clientById(r.clientId) : null;
    const t = alertStart(r);
    const late = r.status === "pending" && t < now && !isHabit(r);
    const soon = !late && r.status === "pending" && t - now < 60 * MIN;
    const when = r.status === "done" ? "Done " + fmtWhen(r.doneAt || r.due) : opts.timeOnly ? fmtTime(t) : fmtWhen(t);
    const meta = [when];
    if (r.repeat) meta.push("\u{1F501} " + repeatLabel(r));
    if (client) meta.push("\u{1F91D} " + client.name);
    if (r.snoozeUntil > now) meta.push("\u{1F634} snoozed");
    return `<div class="item ${r.status === "done" ? "done" : ""}">
    <button class="check ${r.status === "done" ? "on" : ""}" data-a="${r.status === "done" ? "undo" : "done"}" data-id="${r.id}">${r.status === "done" ? "\u2713" : ""}</button>
    <div class="grow" data-a="edit" data-id="${r.id}">
      <div class="title">${taskEmoji(r.task, r.cat)} ${esc(r.task)}</div>
      <div class="meta ${late ? "late" : soon ? "soon" : ""}">${esc(meta.join(" \xB7 "))}</div>
    </div></div>`;
  }
  function payRow(p) {
    const now = Date.now();
    const late = p.status === "pending" && atTime(p.due, 23, 59) < now;
    const dueTxt = p.status === "settled" ? "Settled " + fmtDate(p.settledAt) : (late ? "Overdue \xB7 " : "Due ") + fmtDate(p.due);
    return `<div class="item">
    <div class="emoji">${p.type === "in" ? "\u2B07\uFE0F" : "\u2B06\uFE0F"}</div>
    <div class="grow" data-a="editpay" data-id="${p.id}">
      <div class="title">${esc(p.party)}</div>
      <div class="meta ${late ? "late" : ""}">${esc(dueTxt)}${p.note ? " \xB7 " + esc(p.note) : ""}</div>
    </div>
    <div style="text-align:right">
      <div class="amount ${p.type}">${money(p.amount)}</div>
      ${p.status === "pending" ? `<button class="link" data-a="settle" data-id="${p.id}">${p.type === "in" ? "Received" : "Paid"}</button>` : ""}
    </div></div>`;
  }
  var listOf = (rows, emptyMsg) => rows.length ? `<div class="list">${rows.join("")}</div>` : emptyMsg ? `<div class="empty">${emptyMsg}</div>` : "";
  function renderToday() {
    const now = Date.now(), d0 = startOfDay(now), d1 = addDays(d0, 1);
    const pending = S.reminders.filter((r) => r.status === "pending" && !isHabit(r));
    const overdue = pending.filter((r) => alertStart(r) < now && !(r.repeat && startOfDay(r.due) >= d0)).sort((a, b) => a.due - b.due);
    const today = pending.filter((r) => !overdue.includes(r) && alertStart(r) < d1).sort((a, b) => alertStart(a) - alertStart(b));
    const doneT = S.reminders.filter((r) => r.status === "done" && r.doneAt >= d0);
    const habits = S.reminders.filter((r) => r.status === "pending" && isHabit(r));
    const pays = S.payments.filter((p) => p.status === "pending" && p.due < addDays(d0, 3)).sort((a, b) => a.due - b.due);
    const tomorrow = pending.filter((r) => occurrencesBetween(r, d1, addDays(d1, 1), 3).length).length;
    const left = overdue.length + today.length;
    const st = streak(), dn = doneToday();
    let mood;
    if (!S.reminders.length) mood = "I'm Lucy. Tell me anything you need to remember below \u{1F447}";
    else if (left === 0) mood = dn ? "All clear for today. Proud of you \u2728" : "Nothing pending today. Enjoy the calm \u2615";
    else if (overdue.length >= 3) mood = overdue.length + " things are overdue. Let's clear them, one at a time \u{1F4AA}";
    else mood = left + " thing" + (left > 1 ? "s" : "") + " left today. You've got this.";
    const items = (S.top3.items || []).concat([]);
    while (items.length < 3) items.push({ text: "", done: false });
    const top3Done = items.filter((i) => i.text && i.done).length;
    return `
    ${banners()}
    <div class="hero">
      <div class="lucy-badge"><div class="lucy-dot">L</div>Lucy \xB7 ${esc(fmtDay(now))}, ${new Date(now).getDate()} ${MON[new Date(now).getMonth()]}</div>
      <h1>${esc(greeting(name(), now))}</h1>
      <div class="sub">${esc(mood)}</div>
      <div class="chips"><span class="chip">\u2705 ${dn} done today</span>${st > 1 ? `<span class="chip">\u{1F525} ${st}-day streak</span>` : ""}${tomorrow ? `<span class="chip">\u{1F4C5} ${tomorrow} tomorrow</span>` : ""}</div>
    </div>
    <div class="quick">
      <input id="quick" placeholder="Tell Lucy\u2026 e.g. kal 11am call Mr. Ravi" autocomplete="off" enterkeyhint="done">
      <button class="btn" data-a="quickadd">Add</button>
    </div>
    <div class="preview" id="preview"></div>

    <h2>\u{1F3AF} Today's Top 3 ${top3Done ? `\xB7 ${top3Done}/3` : ""}</h2>
    <div class="list top3">${items.slice(0, 3).map((it, i) => `
      <div class="item ${it.done ? "done" : ""}">
        <button class="check ${it.done ? "on" : ""}" data-a="top3" data-i="${i}">${it.done ? "\u2713" : i + 1}</button>
        <div class="grow"><input data-top3="${i}" value="${esc(it.text)}" placeholder="${["Most important thing today", "Second priority", "Third priority"][i]}"></div>
      </div>`).join("")}</div>

    ${overdue.length ? `<h2 class="late">\u26A0\uFE0F Overdue</h2>${listOf(overdue.map((r) => remRow(r)))}` : ""}
    <h2>\u{1F4C5} Today</h2>
    ${listOf(today.map((r) => remRow(r, { timeOnly: true })), "Nothing else scheduled today.")}
    ${habits.length ? `<h2>\u{1F4AA} Habits</h2><div class="scroll-chips">${habits.map((h) => {
      const c = S.log.filter((e) => e.kind === "done" && e.t >= d0 && e.task === h.task).length;
      return `<button class="chip" data-a="habit" data-id="${h.id}">${taskEmoji(h.task, h.cat)} ${esc(h.task)} \xB7 ${c}\u2713</button>`;
    }).join("")}</div>` : ""}
    ${pays.length ? `<h2>\u{1F4B0} Money due soon</h2>${listOf(pays.map(payRow))}` : ""}
    ${doneT.length ? `<h2>\u2705 Done today</h2>${listOf(doneT.map((r) => remRow(r)))}` : ""}
  `;
  }
  function banners() {
    let h = "";
    if (NATIVE && perm.notif !== "granted") h += `<div class="banner">\u{1F515} Notifications are off, so I can't remind you.<br><button class="btn small" data-a="perm-notif">Turn on notifications</button></div>`;
    if (NATIVE && perm.exact !== "granted") h += `<div class="banner">\u23F1 Allow "Alarms &amp; reminders" so I ring exactly on time, not a few minutes late.<br><button class="btn small" data-a="perm-exact">Allow</button></div>`;
    if (NATIVE && !S.hideTips.battery && S.onboarded) h += `<div class="banner">\u{1F50B} <b>Important:</b> set Lucy's battery usage to <b>Unrestricted</b> so your phone never stops my reminders.<br>Settings \u2192 Apps \u2192 Lucy \u2192 Battery \u2192 Unrestricted.<br><button class="btn small ghost" data-a="hidetip" data-v="battery">Done it</button></div>`;
    return h;
  }
  function updatePreview() {
    const q = $("#quick"), p = $("#preview");
    if (!q || !p) return;
    const v = q.value.trim();
    if (!v) {
      p.innerHTML = "Try: <b>every day 9am drink water</b> \xB7 <b>25/11 Devanshi birthday</b> \xB7 <b>in 20 min check render</b>";
      return;
    }
    const r = parseReminder(v);
    p.innerHTML = r ? `${CAT_EMOJI[r.cat]} <b>${esc(r.task)}</b> \xB7 ${esc(fmtWhen(r.due))}${r.repeat ? " \xB7 \u{1F501} " + esc(repeatLabel(r)) : ""}` : `I'll need a time, e.g. "<b>${esc(v)} at 5pm</b>", or tap Add to pick one.`;
  }
  function renderReminders() {
    const now = Date.now(), d0 = startOfDay(now), d1 = addDays(d0, 1), d2 = addDays(d0, 2), d7 = addDays(d0, 7);
    const f = view.filter;
    const match = (r) => f === "All" || (f === "Repeating" ? !!r.repeat : r.cat === f);
    const pend = S.reminders.filter((r) => r.status === "pending" && match(r)).sort((a, b) => alertStart(a) - alertStart(b));
    const one = pend.filter((r) => !r.repeat);
    const groups = [
      ["\u26A0\uFE0F Overdue", one.filter((r) => alertStart(r) < now)],
      ["Today", one.filter((r) => alertStart(r) >= now && alertStart(r) < d1)],
      ["Tomorrow", one.filter((r) => alertStart(r) >= d1 && alertStart(r) < d2)],
      ["This week", one.filter((r) => alertStart(r) >= d2 && alertStart(r) < d7)],
      ["Later", one.filter((r) => alertStart(r) >= d7)],
      ["\u{1F501} Repeating", pend.filter((r) => r.repeat)]
    ];
    const done = S.reminders.filter((r) => r.status === "done" && match(r)).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 15);
    const filters = ["All"].concat(CATS, ["Repeating"]);
    const body = groups.filter((g) => g[1].length).map((g) => `<h2 class="${g[0].includes("Overdue") ? "late" : ""}">${g[0]}</h2>${listOf(g[1].map((r) => remRow(r)))}`).join("");
    return `
    <h1>Reminders</h1><div class="sub">${pend.length} pending</div>
    <div class="scroll-chips" style="margin-top:12px">${filters.map((x) => `<button class="chip ${x === f ? "on" : ""}" data-a="filter" data-v="${x}">${x === "All" ? "All" : x === "Repeating" ? "\u{1F501} Repeating" : CAT_EMOJI[x] + " " + x}</button>`).join("")}</div>
    ${body || '<div class="empty">Nothing here yet. Tap + to add a reminder.</div>'}
    ${done.length ? `<h2>\u2705 Recently done</h2>${listOf(done.map((r) => remRow(r)))}` : ""}
  `;
  }
  function renderClients() {
    if (view.clientId) return renderClient(clientById(view.clientId));
    const rows = S.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
      const fu = S.reminders.filter((r) => r.clientId === c.id && r.status === "pending").length;
      const due = S.payments.filter((p) => p.status === "pending" && p.clientId === c.id && p.type === "in").reduce((a, p) => a + Number(p.amount), 0);
      return `<div class="item" data-a="client" data-id="${c.id}">
      <div class="lucy-dot" style="width:36px;height:36px;flex:none">${esc(c.name.charAt(0).toUpperCase())}</div>
      <div class="grow"><div class="title">${esc(c.name)}</div>
      <div class="meta">${fu ? fu + " follow-up" + (fu > 1 ? "s" : "") : "No follow-ups"}${due ? " \xB7 " + money(due) + " to collect" : ""}</div></div><span class="sub">\u203A</span></div>`;
    });
    return `<h1>Clients</h1><div class="sub">Follow-ups, notes and money, per client</div>
    <button class="btn block ghost" data-a="newclient">+ Add client</button>
    <h2>All clients</h2>${listOf(rows, "No clients yet. Add your first one above.")}`;
  }
  function renderClient(c) {
    if (!c) {
      view.clientId = null;
      return renderClients();
    }
    const rems = S.reminders.filter((r) => r.clientId === c.id && r.status === "pending").sort((a, b) => alertStart(a) - alertStart(b));
    const doneR = S.reminders.filter((r) => r.clientId === c.id && r.status === "done").slice(-5).reverse();
    const pays = S.payments.filter((p) => p.clientId === c.id).sort((a, b) => a.status === b.status ? a.due - b.due : a.status === "pending" ? -1 : 1);
    const phone = (c.phone || "").replace(/[^\d+]/g, "");
    const wa = phone ? phone.startsWith("+") ? phone.slice(1) : phone.length === 10 ? "91" + phone : phone : "";
    return `
    <button class="back" data-a="back">\u2039 Clients</button>
    <div class="hero"><h1>${esc(c.name)}</h1>
      <div class="sub">${esc(c.business || "")}${c.phone ? " \xB7 " + esc(c.phone) : ""}</div>
      <div class="actions">${phone ? `<a class="btn small" href="tel:${esc(phone)}">\u{1F4DE} Call</a><a class="btn small ghost" href="https://wa.me/${esc(wa)}">\u{1F4AC} WhatsApp</a>` : ""}
      <button class="btn small ghost" data-a="editclient" data-id="${c.id}">\u270F\uFE0F Edit</button></div>
    </div>
    <h2>\u{1F4DD} Notes &amp; meeting prep</h2>
    <textarea id="client-notes" data-cid="${c.id}" placeholder="What do they want? Budget? Last discussion? Lucy shows this 30 min before any meeting with ${esc(c.name)}.">${esc(c.notes || "")}</textarea>
    <h2>\u{1F4DE} Follow-ups</h2>
    <div class="quick"><input id="client-quick" placeholder="e.g. monday 11am send quotation" data-cid="${c.id}"><button class="btn" data-a="clientadd" data-id="${c.id}">Add</button></div>
    <div style="height:8px"></div>
    ${listOf(rems.map((r) => remRow(r)), "No pending follow-ups.")}
    <h2>\u{1F4B0} Payments</h2>
    <button class="btn small ghost" data-a="newpay" data-cid="${c.id}">+ Add payment</button><div style="height:8px"></div>
    ${listOf(pays.map(payRow), "No payments recorded.")}
    ${doneR.length ? `<h2>History</h2>${listOf(doneR.map((r) => remRow(r)))}` : ""}`;
  }
  function renderMoney() {
    const pend = S.payments.filter((p) => p.status === "pending");
    const sum = (arr) => arr.reduce((a, p) => a + Number(p.amount), 0);
    const now = Date.now();
    const inP = pend.filter((p) => p.type === "in"), outP = pend.filter((p) => p.type === "out");
    const lateIn = inP.filter((p) => atTime(p.due, 23, 59) < now);
    const lateOut = outP.filter((p) => atTime(p.due, 23, 59) < now);
    const tab = view.moneyTab;
    const list = (tab === "in" ? inP : outP).sort((a, b) => a.due - b.due);
    const settled = S.payments.filter((p) => p.status === "settled" && p.type === tab).sort((a, b) => b.settledAt - a.settledAt).slice(0, 15);
    return `<h1>Money</h1><div class="sub">What's coming in, what's going out</div>
    <div class="stats" style="margin-top:14px">
      <div class="stat"><div class="l">To receive</div><div class="n in">${money(sum(inP))}</div><div class="sub ${lateIn.length ? "late" : ""}">${lateIn.length ? lateIn.length + " overdue" : inP.length + " pending"}</div></div>
      <div class="stat"><div class="l">To pay</div><div class="n out">${money(sum(outP))}</div><div class="sub ${lateOut.length ? "late" : ""}">${lateOut.length ? lateOut.length + " overdue" : outP.length + " pending"}</div></div>
    </div>
    <div class="seg"><button class="${tab === "in" ? "on" : ""}" data-a="mtab" data-v="in">\u2B07\uFE0F To receive</button><button class="${tab === "out" ? "on" : ""}" data-a="mtab" data-v="out">\u2B06\uFE0F To pay</button></div>
    <h2>Pending</h2>${listOf(list.map(payRow), tab === "in" ? "Nobody owes you anything right now \u{1F389}" : "No bills pending \u{1F389}")}
    ${settled.length ? `<h2>Settled</h2>${listOf(settled.map(payRow))}` : ""}
    <div class="sub" style="margin:14px 4px">\u{1F4A1} For monthly bills like rent, EMI or SIP, add a repeating reminder: <b>every month 5th 10am pay rent</b></div>`;
  }
  function renderMore() {
    const subs = { notes: renderNotes, shopping: renderShopping, learning: renderLearning, journal: renderJournal, review: renderReview, settings: renderSettings, backup: renderBackup };
    if (view.sub && subs[view.sub]) return '<button class="back" data-a="back">\u2039 More</button>' + subs[view.sub]();
    const tile = (sub, icon, title, small) => `<button class="tile" data-a="sub" data-v="${sub}"><span>${icon}</span><b>${title}</b><small>${small}</small></button>`;
    const shopLeft = S.shopping.filter((s) => !s.done).length;
    const learnLeft = S.learning.filter((s) => !s.done).length;
    return `<h1>More</h1><div class="sub">Lucy's second brain</div><div style="height:14px"></div>
    <div class="tiles">
      ${tile("notes", "\u{1F4A1}", "Ideas &amp; notes", S.notes.length + " saved")}
      ${tile("shopping", "\u{1F6D2}", "Shopping list", shopLeft + " to buy")}
      ${tile("learning", "\u{1F4DA}", "Learning", learnLeft + " in queue")}
      ${tile("journal", "\u{1F319}", "Journal", S.journal[dayKey(Date.now())] ? "Written today \u2713" : "Write today")}
      ${tile("review", "\u{1F4CA}", "Weekly review", "Last 7 days")}
      ${tile("settings", "\u2699\uFE0F", "Settings", "Timings &amp; nags")}
      ${tile("backup", "\u{1F4BE}", "Backup", "Keep your data safe")}
    </div>`;
  }
  function renderNotes() {
    const q = view.noteQ.toLowerCase();
    const notes = S.notes.filter((n) => !q || n.text.toLowerCase().includes(q)).sort((a, b) => b.pinned - a.pinned || b.created - a.created);
    const fmt = (t) => esc(t).replace(/#(\w+)/g, '<span class="tag">#$1</span>');
    return `<h1>\u{1F4A1} Ideas &amp; notes</h1><div class="sub">Reel ideas, hooks, concepts. Use #tags to group them.</div>
    <div style="height:12px"></div>
    <textarea id="note-new" placeholder="New idea\u2026 e.g. Hook: 'Your logo isn't the problem' #reel"></textarea>
    <button class="btn block" data-a="addnote">Save idea</button>
    <h2>Saved</h2><input id="note-q" placeholder="Search notes" value="${esc(view.noteQ)}"><div style="height:8px"></div>
    ${listOf(notes.map((n) => `<div class="item"><div class="grow" data-a="editnote" data-id="${n.id}">
      <div class="note-text">${n.pinned ? "\u{1F4CC} " : ""}${fmt(n.text)}</div><div class="meta">${fmtDate(n.created)}</div></div></div>`), "No notes yet.")}`;
  }
  function renderShopping() {
    const left = S.shopping.filter((s) => !s.done), got = S.shopping.filter((s) => s.done);
    const row = (s) => `<div class="item ${s.done ? "done" : ""}"><button class="check ${s.done ? "on" : ""}" data-a="shop" data-id="${s.id}">${s.done ? "\u2713" : ""}</button><div class="grow title">${esc(s.text)}</div><button class="sub" data-a="delshop" data-id="${s.id}">\u2715</button></div>`;
    return `<h1>\u{1F6D2} Shopping list</h1><div style="height:12px"></div>
    <div class="quick"><input id="shop-new" placeholder="Add item\u2026 (comma for many: milk, eggs, bread)"><button class="btn" data-a="addshop">Add</button></div>
    <h2>To buy \xB7 ${left.length}</h2>${listOf(left.map(row), "All bought \u2728")}
    ${got.length ? `<h2>In the cart</h2>${listOf(got.map(row))}<button class="btn small ghost" data-a="clearshop">Clear bought items</button>` : ""}`;
  }
  function renderLearning() {
    const icons = { Watch: "\u{1F3AC}", Read: "\u{1F4D6}", Learn: "\u{1F9E0}", Practice: "\u{1F3AF}" };
    const left = S.learning.filter((s) => !s.done), done = S.learning.filter((s) => s.done).slice(-10).reverse();
    const row = (s) => `<div class="item ${s.done ? "done" : ""}"><button class="check ${s.done ? "on" : ""}" data-a="learn" data-id="${s.id}">${s.done ? "\u2713" : ""}</button><div class="emoji">${icons[s.type] || "\u{1F9E0}"}</div><div class="grow title">${esc(s.text)}</div><button class="sub" data-a="dellearn" data-id="${s.id}">\u2715</button></div>`;
    return `<h1>\u{1F4DA} Learning</h1><div class="sub">Tutorials to watch, books to read, skills to practise</div><div style="height:12px"></div>
    <div class="seg" id="learn-type">${Object.keys(icons).map((k, i) => `<button class="${i === 0 ? "on" : ""}" data-a="ltype" data-v="${k}">${icons[k]} ${k}</button>`).join("")}</div>
    <div style="height:8px"></div>
    <div class="quick"><input id="learn-new" placeholder="e.g. Roger Deakins lighting masterclass"><button class="btn" data-a="addlearn">Add</button></div>
    <h2>Queue \xB7 ${left.length}</h2>${listOf(left.map(row), "Queue is empty.")}
    ${done.length ? `<h2>Finished</h2>${listOf(done.map(row))}` : ""}`;
  }
  function renderJournal() {
    const k = dayKey(Date.now());
    const e = S.journal[k] || {};
    const past = Object.keys(S.journal).filter((d) => d !== k).sort().reverse().slice(0, 30);
    return `<h1>\u{1F319} Journal</h1><div class="sub">Two minutes. Three lines. Every evening.</div>
    <label>\u2728 What went well today?</label><textarea data-j="good" rows="2" style="min-height:60px">${esc(e.good || "")}</textarea>
    <label>\u{1F527} What will I do better tomorrow?</label><textarea data-j="better" rows="2" style="min-height:60px">${esc(e.better || "")}</textarea>
    <label>\u{1F64F} Grateful for</label><textarea data-j="grateful" rows="2" style="min-height:60px">${esc(e.grateful || "")}</textarea>
    <div class="sub" style="margin-top:6px">Saves automatically.</div>
    ${past.length ? `<h2>Past entries</h2>${past.map((d) => {
      const x = S.journal[d], dt = /* @__PURE__ */ new Date(d + "T12:00:00");
      return `<div class="card"><b>${fmtDate(dt.getTime())}</b>
        ${x.good ? `<div class="sub" style="margin-top:6px">\u2728 ${esc(x.good)}</div>` : ""}${x.better ? `<div class="sub">\u{1F527} ${esc(x.better)}</div>` : ""}${x.grateful ? `<div class="sub">\u{1F64F} ${esc(x.grateful)}</div>` : ""}</div>`;
    }).join("")}` : ""}`;
  }
  function renderReview() {
    const now = Date.now(), from = addDays(startOfDay(now), -6);
    const log = S.log.filter((e) => e.t >= from);
    const done = log.filter((e) => e.kind === "done"), missed = log.filter((e) => e.kind === "missed");
    const paidIn = log.filter((e) => e.kind === "paid" && e.dir === "in").reduce((a, e) => a + Number(e.amount || 0), 0);
    const paidOut = log.filter((e) => e.kind === "paid" && e.dir === "out").reduce((a, e) => a + Number(e.amount || 0), 0);
    const overdueNow = S.reminders.filter((r) => r.status === "pending" && !r.repeat && r.due < now);
    const byCat = {};
    done.forEach((e) => {
      byCat[e.cat || "Personal"] = (byCat[e.cat || "Personal"] || 0) + 1;
    });
    const maxC = Math.max(1, ...Object.values(byCat));
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(startOfDay(now), -i);
      days.push({ d, n: done.filter((e) => e.t >= d && e.t < addDays(d, 1)).length });
    }
    const maxD = Math.max(1, ...days.map((x) => x.n));
    const journalDays = Object.keys(S.journal).filter((k) => k >= dayKey(from)).length;
    const next = S.reminders.filter((r) => r.status === "pending" && !isHabit(r) && occurrencesBetween(r, now, addDays(now, 7), 10).length).length;
    const best = days.slice().sort((a, b) => b.n - a.n)[0];
    return `<h1>\u{1F4CA} Weekly review</h1><div class="sub">${fmtDate(from)} \u2192 today</div><div style="height:14px"></div>
    <div class="stats">
      <div class="stat"><div class="l">Done</div><div class="n">${done.length}</div></div>
      <div class="stat"><div class="l">Slipped</div><div class="n ${missed.length ? "late" : ""}">${missed.length + overdueNow.length}</div></div>
      <div class="stat"><div class="l">Received</div><div class="n in">${money(paidIn)}</div></div>
      <div class="stat"><div class="l">Paid</div><div class="n out">${money(paidOut)}</div></div>
    </div>
    <div class="card"><h3>Your week</h3>
      <div style="display:flex;align-items:flex-end;gap:8px;height:110px;margin-top:10px">${days.map((x) => `
        <div style="flex:1;text-align:center"><div style="height:${Math.round(80 * x.n / maxD) + 4}px;border-radius:8px;background:linear-gradient(180deg,var(--accent2),var(--accent))"></div>
        <div class="sub" style="font-size:11px;margin-top:4px">${DAYNAME[new Date(x.d).getDay()]}</div><div style="font-size:12px">${x.n}</div></div>`).join("")}</div>
      ${best && best.n ? `<div class="sub" style="margin-top:8px">Best day: <b>${DAYNAME[new Date(best.d).getDay()]}</b> with ${best.n} done \u{1F3C6}</div>` : ""}
    </div>
    ${Object.keys(byCat).length ? `<div class="card"><h3>Where your effort went</h3>${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => `
      <div style="margin-top:10px"><div class="row"><span class="grow">${CAT_EMOJI[c] || "\u2728"} ${c}</span><b>${n}</b></div><div class="bar"><i style="width:${Math.round(100 * n / maxC)}%"></i></div></div>`).join("")}</div>` : ""}
    <div class="card"><h3>Habits of the mind</h3>
      <div class="sub">\u{1F319} Journal written ${journalDays}/7 days \xB7 \u{1F525} Streak ${streak()} day${streak() === 1 ? "" : "s"}</div></div>
    ${overdueNow.length ? `<h2 class="late">Still overdue: reschedule or drop</h2>${listOf(overdueNow.map((r) => remRow(r)))}` : ""}
    ${missed.length ? `<h2>Repeating items you missed</h2><div class="card sub">${[...new Set(missed.map((e) => e.task))].map(esc).join(" \xB7 ")}</div>` : ""}
    <div class="card"><h3>Next 7 days</h3><div class="sub">${next} reminder${next === 1 ? "" : "s"} coming up. ${next > 25 ? "Busy week, so protect your Top 3 every morning." : "Looks manageable \u{1F44D}"}</div></div>`;
  }
  function renderSettings() {
    const st = S.settings;
    const sel = (key, opts) => `<select data-set="${key}">${opts.map((o) => `<option value="${o[0]}" ${String(st[key]) === String(o[0]) ? "selected" : ""}>${o[1]}</option>`).join("")}</select>`;
    return `<h1>\u2699\uFE0F Settings</h1>
    <label>Your name</label><input data-set="name" value="${esc(st.name)}">
    <div class="grid2">
      <div><label>Re-remind every</label>${sel("nagMin", [[5, "5 min"], [10, "10 min"], [15, "15 min"], [20, "20 min"], [30, "30 min"], [60, "1 hour"]])}</div>
      <div><label>Max re-reminders</label>${sel("maxNags", [[2, "2 times"], [4, "4 times"], [6, "6 times"], [8, "8 times"], [12, "12 times"]])}</div>
      <div><label>Snooze button</label>${sel("snoozeMin", [[5, "5 min"], [10, "10 min"], [15, "15 min"], [30, "30 min"], [60, "1 hour"]])}</div>
      <div><label>Morning briefing</label><input type="time" data-set="briefTime" value="${st.briefTime}"></div>
      <div><label>Journal prompt</label><input type="time" data-set="journalTime" value="${st.journalTime}"></div>
      <div><label>Top 3 check-ins</label>${sel("top3Checks", [["true", "2pm &amp; 6pm"], ["false", "Off"]])}</div>
      <div><label>Weekly review day</label>${sel("reviewDay", DAYNAME.map((d, i) => [i, d]))}</div>
      <div><label>Review time</label><input type="time" data-set="reviewTime" value="${st.reviewTime}"></div>
      <div><label>Habits quiet from</label><input type="time" data-set="quietStart" value="${st.quietStart}"></div>
      <div><label>Quiet until</label><input type="time" data-set="quietEnd" value="${st.quietEnd}"></div>
    </div>
    <div class="sub" style="margin-top:8px">Quiet hours stop habit pings (water, stretch) at night. Normal reminders still ring.</div>
    <h2>Check Lucy is working</h2>
    <button class="btn block ghost" data-a="test">\u{1F514} Send a test notification in 10 seconds</button>
    ${NATIVE ? `<div class="card" style="margin-top:10px"><div class="sub">Notifications: <b>${perm.notif}</b> \xB7 Exact alarms: <b>${perm.exact}</b></div>
      ${perm.notif !== "granted" ? '<button class="btn small" data-a="perm-notif">Turn on notifications</button> ' : ""}${perm.exact !== "granted" ? '<button class="btn small" data-a="perm-exact">Allow exact alarms</button>' : ""}</div>` : ""}
    <div class="card"><b>\u{1F50B} If reminders come late or not at all</b><div class="sub" style="margin-top:6px">Open phone Settings \u2192 Apps \u2192 Lucy \u2192 Battery \u2192 choose <b>Unrestricted</b>. On Xiaomi/Redmi/Realme/Oppo/Vivo also turn on <b>Autostart</b> for Lucy.</div></div>
    <div class="sub" style="text-align:center;margin-top:18px">Lucy v1.0 \xB7 made for ${esc(st.name)} \u{1F4AB}</div>`;
  }
  function renderBackup() {
    return `<h1>\u{1F4BE} Backup</h1>
    <div class="sub">Your data lives only on this phone. Copy a backup now and then, and paste it into WhatsApp "Message yourself" or Google Keep. If you change phones, paste it back here.</div>
    <h2>Make a backup</h2>
    <textarea id="bk-out" readonly style="min-height:110px;font-size:12px">${esc(JSON.stringify(S))}</textarea>
    <button class="btn block" data-a="copybk">\u{1F4CB} Copy backup</button>
    <h2>Restore a backup</h2>
    <textarea id="bk-in" placeholder="Paste your backup text here" style="font-size:12px"></textarea>
    <button class="btn block danger" data-a="restore">Restore (replaces current data)</button>`;
  }
  function openSheet(html) {
    $("#sheet").innerHTML = html;
    $("#sheet-wrap").hidden = false;
  }
  function closeSheet() {
    $("#sheet-wrap").hidden = true;
    $("#sheet").innerHTML = "";
  }
  function reminderSheet(r, preset) {
    const isNew = !r;
    const base = r || Object.assign({ task: "", cat: "Personal", due: atTime(addDays(Date.now(), 0), (/* @__PURE__ */ new Date()).getHours() + 1, 0), repeat: "", clientId: null }, preset || {});
    const rep = base.repeat || "";
    const every = isHabit(base) ? Number(rep.split(":")[1]) : 60;
    const repKind = isHabit(base) ? "every" : rep;
    openSheet(`
    <h3>${isNew ? "New reminder" : "Edit reminder"}</h3>
    <label>What?</label><input id="f-task" value="${esc(base.task)}" placeholder="Call Mr. Ravi">
    <div class="grid2">
      <div><label>Date</label><input id="f-date" type="date" value="${toDateInput(base.due)}"></div>
      <div><label>Time</label><input id="f-time" type="time" value="${toTimeInput(base.due)}"></div>
    </div>
    <div class="grid2">
      <div><label>Repeat</label><select id="f-rep">
        ${[["", "Never"], ["daily", "Every day"], ["weekly", "Every week"], ["monthly", "Every month"], ["yearly", "Every year"], ["every", "Every few minutes/hours"]].map((o) => `<option value="${o[0]}" ${repKind === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}
      </select></div>
      <div><label>Category</label><select id="f-cat">${CATS.map((c) => `<option ${c === base.cat ? "selected" : ""}>${c}</option>`).join("")}</select></div>
    </div>
    <div id="f-every-wrap" ${repKind === "every" ? "" : "hidden"}><label>Every (minutes)</label><input id="f-every" type="number" min="5" step="5" value="${every}"></div>
    <label>Client (optional)</label><select id="f-client"><option value="">None</option>${S.clients.map((c) => `<option value="${c.id}" ${c.id === base.clientId ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
    <button class="btn block" data-a="saverem" data-id="${isNew ? "" : r.id}">${isNew ? "Add reminder" : "Save"}</button>
    ${!isNew && r.status === "pending" ? `<div class="actions">
      <button class="btn small ghost" data-a="done" data-id="${r.id}">\u2705 Done</button>
      <button class="btn small ghost" data-a="snz" data-id="${r.id}" data-v="10">\u{1F634} 10 min</button>
      <button class="btn small ghost" data-a="snz" data-id="${r.id}" data-v="60">\u{1F634} 1 hour</button>
      <button class="btn small ghost" data-a="tomorrow" data-id="${r.id}">\u27A1\uFE0F Tomorrow</button></div>` : ""}
    ${!isNew ? `<button class="btn block danger" data-a="delrem" data-id="${r.id}">Delete</button>` : ""}`);
  }
  function saveReminderFromSheet(id) {
    const task = $("#f-task").value.trim();
    if (!task) return toast("What should I remind you about?");
    const due = fromInputs($("#f-date").value, $("#f-time").value);
    let repeat = $("#f-rep").value;
    if (repeat === "every") {
      const n = Math.max(5, Number($("#f-every").value) || 60);
      repeat = "every:" + n;
    }
    const data = { task, due, start: due, repeat, cat: $("#f-cat").value, clientId: Number($("#f-client").value) || null };
    if (id) {
      const r = remById(id);
      Object.assign(r, data, { snoozeUntil: 0, status: "pending" });
      if (repeat && due <= Date.now()) r.due = nextAfter(r, Date.now());
      save();
      toast("Saved \u2713");
    } else {
      if (repeat && due <= Date.now()) {
        const tmp = Object.assign({}, data);
        data.due = nextAfter(tmp, Date.now());
      }
      const r = addReminder(data);
      toast("Got it \u2705 " + fmtWhen(alertStart(r)));
    }
    closeSheet();
    render();
  }
  function paymentSheet(p, preset) {
    const isNew = !p;
    const base = p || Object.assign({ type: view.moneyTab || "in", party: "", amount: "", due: startOfDay(Date.now()), note: "", clientId: null }, preset || {});
    if (preset && preset.clientId && !base.party) base.party = (clientById(preset.clientId) || {}).name || "";
    openSheet(`
    <h3>${isNew ? "New payment" : "Edit payment"}</h3>
    <div class="seg" id="p-type"><button class="${base.type === "in" ? "on" : ""}" data-a="ptype" data-v="in">\u2B07\uFE0F I'll receive</button><button class="${base.type === "out" ? "on" : ""}" data-a="ptype" data-v="out">\u2B06\uFE0F I'll pay</button></div>
    <label>Who?</label><input id="p-party" list="p-clients" value="${esc(base.party)}" placeholder="Client or person">
    <datalist id="p-clients">${S.clients.map((c) => `<option value="${esc(c.name)}">`).join("")}</datalist>
    <div class="grid2">
      <div><label>Amount (\u20B9)</label><input id="p-amount" type="number" inputmode="numeric" value="${esc(base.amount)}" placeholder="25000"></div>
      <div><label>Due date</label><input id="p-due" type="date" value="${toDateInput(base.due)}"></div>
    </div>
    <label>Note</label><input id="p-note" value="${esc(base.note)}" placeholder="e.g. 50% advance for reel shoot">
    <button class="btn block" data-a="savepay" data-id="${isNew ? "" : p.id}">${isNew ? "Add" : "Save"}</button>
    ${!isNew && p.status === "pending" ? `<button class="btn block ghost" data-a="settle" data-id="${p.id}">${p.type === "in" ? "\u2705 Mark received" : "\u2705 Mark paid"}</button>` : ""}
    ${!isNew ? `<button class="btn block danger" data-a="delpay" data-id="${p.id}">Delete</button>` : ""}`);
    $("#sheet").dataset.ptype = base.type;
  }
  function savePaymentFromSheet(id) {
    const party = $("#p-party").value.trim();
    const amount = Number($("#p-amount").value);
    if (!party || !amount) return toast("Add who and how much");
    const client = S.clients.find((c) => c.name.toLowerCase() === party.toLowerCase());
    const data = { type: $("#sheet").dataset.ptype || "in", party, amount, due: startOfDay(fromInputs($("#p-due").value, "00:00")), note: $("#p-note").value.trim(), clientId: client ? client.id : null };
    if (id) Object.assign(payById(id), data, { snoozeUntil: 0 });
    else S.payments.push(Object.assign({ id: nid(), status: "pending", created: Date.now() }, data));
    save();
    closeSheet();
    render();
    toast("Saved \u2713");
  }
  function clientSheet(c) {
    const isNew = !c;
    const base = c || { name: "", business: "", phone: "" };
    openSheet(`<h3>${isNew ? "New client" : "Edit client"}</h3>
    <label>Name</label><input id="c-name" value="${esc(base.name)}" placeholder="e.g. Kliya Cafe">
    <label>Contact person / business</label><input id="c-biz" value="${esc(base.business)}" placeholder="e.g. Rahul, rooftop cafe">
    <label>Phone</label><input id="c-phone" type="tel" value="${esc(base.phone)}" placeholder="98xxxxxxxx">
    <button class="btn block" data-a="saveclient" data-id="${isNew ? "" : c.id}">${isNew ? "Add client" : "Save"}</button>
    ${!isNew ? `<button class="btn block danger" data-a="delclient" data-id="${c.id}">Delete client</button>` : ""}`);
  }
  function noteSheet(n) {
    openSheet(`<h3>Edit note</h3><textarea id="n-text" style="min-height:180px">${esc(n.text)}</textarea>
    <button class="btn block" data-a="savenote" data-id="${n.id}">Save</button>
    <div class="actions"><button class="btn small ghost" data-a="pinnote" data-id="${n.id}">${n.pinned ? "Unpin" : "\u{1F4CC} Pin"}</button>
    <button class="btn small ghost" data-a="note2rem" data-id="${n.id}">\u23F0 Make it a reminder</button></div>
    <button class="btn block danger" data-a="delnote" data-id="${n.id}">Delete</button>`);
  }
  function onboardingSheet() {
    openSheet(`<div style="text-align:center"><div class="lucy-dot" style="width:64px;height:64px;font-size:30px;margin:6px auto 10px">L</div>
    <h3>Hi, I'm Lucy \u{1F44B}</h3><div class="sub">I'll remember everything, so you don't have to.</div></div>
    <label>What should I call you?</label><input id="ob-name" value="${esc(S.settings.name)}">
    <label>Start with a few healthy habits? (you can change them later)</label>
    <div class="list">
      <label class="item" style="text-transform:none;font-size:15px;color:var(--text);margin:0"><input type="checkbox" id="ob-water" checked style="width:auto"> \u{1F4A7} Drink water every hour</label>
      <label class="item" style="text-transform:none;font-size:15px;color:var(--text);margin:0"><input type="checkbox" id="ob-stand" checked style="width:auto"> \u{1F9CD} Stand up &amp; stretch every 45 min</label>
      <label class="item" style="text-transform:none;font-size:15px;color:var(--text);margin:0"><input type="checkbox" id="ob-gym" style="width:auto"> \u{1F3CB}\uFE0F Gym every day at <input type="time" id="ob-gymtime" value="07:00" style="width:auto;padding:4px 8px;margin-left:6px"></label>
    </div>
    <div class="sub">Habit pings stay quiet from 10:30 PM to 8 AM.</div>
    <button class="btn block" data-a="obdone">Let's go \u2728</button>`);
  }
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-a]");
    if (!el) return;
    const a = el.dataset.a, id = el.dataset.id, v = el.dataset.v;
    switch (a) {
      case "tab":
        go(v);
        break;
      case "close":
        closeSheet();
        break;
      case "back":
        view.sub = null;
        view.clientId = null;
        render();
        break;
      case "sub":
        go("more", v);
        break;
      case "fab":
        if (view.tab === "money") paymentSheet();
        else if (view.tab === "clients" && !view.clientId) clientSheet();
        else if (view.tab === "clients") reminderSheet(null, { cat: "Follow-up", clientId: view.clientId });
        else if (view.sub === "notes") {
          const t = $("#note-new");
          if (t) t.focus();
        } else if (view.sub === "shopping") {
          const t = $("#shop-new");
          if (t) t.focus();
        } else if (view.sub === "learning") {
          const t = $("#learn-new");
          if (t) t.focus();
        } else reminderSheet();
        break;
      case "quickadd":
        quickAdd();
        break;
      case "done":
        markDone(id);
        closeSheet();
        render();
        break;
      case "undo":
        undoDone(id);
        render();
        break;
      case "edit": {
        const r = remById(id);
        if (r) reminderSheet(r);
        break;
      }
      case "saverem":
        saveReminderFromSheet(id ? Number(id) : null);
        break;
      case "delrem":
        if (confirm("Delete this reminder?")) {
          deleteReminder(id);
          closeSheet();
          render();
        }
        break;
      case "snz":
        snooze(id, Number(v));
        closeSheet();
        render();
        break;
      case "tomorrow": {
        const r = remById(id);
        if (r) {
          const t = new Date(alertStart(r));
          r.snoozeUntil = 0;
          r.due = atTime(addDays(startOfDay(Date.now()), 1), t.getHours(), t.getMinutes());
          if (r.repeat) r.start = r.due;
          save();
          toast("Moved to " + fmtWhen(r.due));
        }
        closeSheet();
        render();
        break;
      }
      case "habit":
        markDone(id);
        render();
        break;
      case "top3": {
        const i = Number(el.dataset.i);
        while (S.top3.items.length <= i) S.top3.items.push({ text: "", done: false });
        const it = S.top3.items[i];
        if (!it.text) {
          toast("Write your priority first");
          break;
        }
        it.done = !it.done;
        if (it.done) {
          logEvent("done", { task: it.text, cat: "Personal" }, { top3: true });
          toast(S.top3.items.filter((x) => x.done).length === 3 ? "\u{1F3C6} All 3 done! Big day." : cheer(doneToday()));
        }
        save(true);
        render();
        break;
      }
      case "filter":
        view.filter = v;
        render();
        break;
      case "mtab":
        view.moneyTab = v;
        render();
        break;
      case "settle":
        settlePayment(id);
        closeSheet();
        render();
        break;
      case "newpay":
        paymentSheet(null, { clientId: Number(el.dataset.cid) || null });
        break;
      case "editpay": {
        const p = payById(id);
        if (p) paymentSheet(p);
        break;
      }
      case "ptype":
        document.querySelectorAll("#p-type button").forEach((b) => b.classList.toggle("on", b === el));
        $("#sheet").dataset.ptype = v;
        break;
      case "savepay":
        savePaymentFromSheet(id ? Number(id) : null);
        break;
      case "delpay":
        if (confirm("Delete this payment?")) {
          S.payments = S.payments.filter((p) => p.id !== Number(id));
          save();
          closeSheet();
          render();
        }
        break;
      case "client":
        go("clients", null, id);
        break;
      case "newclient":
        clientSheet();
        break;
      case "editclient":
        clientSheet(clientById(id));
        break;
      case "saveclient": {
        const nm = $("#c-name").value.trim();
        if (!nm) {
          toast("Add a name");
          break;
        }
        const data = { name: nm, business: $("#c-biz").value.trim(), phone: $("#c-phone").value.trim() };
        if (id) Object.assign(clientById(id), data);
        else {
          const c = Object.assign({ id: nid(), notes: "", created: Date.now() }, data);
          S.clients.push(c);
          view.clientId = c.id;
        }
        save();
        closeSheet();
        render();
        break;
      }
      case "delclient":
        if (confirm("Delete this client? Their reminders and payments stay, just unlinked.")) {
          const cid = Number(id);
          S.clients = S.clients.filter((c) => c.id !== cid);
          S.reminders.forEach((r) => {
            if (r.clientId === cid) r.clientId = null;
          });
          S.payments.forEach((p) => {
            if (p.clientId === cid) p.clientId = null;
          });
          view.clientId = null;
          save();
          closeSheet();
          render();
        }
        break;
      case "clientadd":
        clientQuickAdd(Number(id));
        break;
      case "addnote": {
        const t = $("#note-new").value.trim();
        if (!t) break;
        S.notes.push({ id: nid(), text: t, created: Date.now(), pinned: false });
        save(true);
        render();
        toast("\u{1F4A1} Saved");
        break;
      }
      case "editnote": {
        const n = S.notes.find((x) => x.id === Number(id));
        if (n) noteSheet(n);
        break;
      }
      case "savenote": {
        const n = S.notes.find((x) => x.id === Number(id));
        n.text = $("#n-text").value;
        save(true);
        closeSheet();
        render();
        break;
      }
      case "pinnote": {
        const n = S.notes.find((x) => x.id === Number(id));
        n.pinned = !n.pinned;
        save(true);
        closeSheet();
        render();
        break;
      }
      case "delnote":
        if (confirm("Delete this note?")) {
          S.notes = S.notes.filter((x) => x.id !== Number(id));
          save(true);
          closeSheet();
          render();
        }
        break;
      case "note2rem": {
        const n = S.notes.find((x) => x.id === Number(id));
        closeSheet();
        reminderSheet(null, { task: n.text.split("\n")[0].slice(0, 80) });
        break;
      }
      case "addshop": {
        const inp = $("#shop-new");
        inp.value.split(",").map((s) => s.trim()).filter(Boolean).forEach((t) => S.shopping.push({ id: nid(), text: t, done: false }));
        save(true);
        render();
        setTimeout(() => $("#shop-new") && $("#shop-new").focus(), 30);
        break;
      }
      case "shop": {
        const s = S.shopping.find((x) => x.id === Number(id));
        s.done = !s.done;
        save(true);
        render();
        break;
      }
      case "delshop":
        S.shopping = S.shopping.filter((x) => x.id !== Number(id));
        save(true);
        render();
        break;
      case "clearshop":
        S.shopping = S.shopping.filter((x) => !x.done);
        save(true);
        render();
        break;
      case "ltype":
        document.querySelectorAll("#learn-type button").forEach((b) => b.classList.toggle("on", b === el));
        break;
      case "addlearn": {
        const t = $("#learn-new").value.trim();
        if (!t) break;
        const on = document.querySelector("#learn-type button.on");
        S.learning.push({ id: nid(), text: t, type: on ? on.dataset.v : "Learn", done: false, created: Date.now() });
        save(true);
        render();
        break;
      }
      case "learn": {
        const s = S.learning.find((x) => x.id === Number(id));
        s.done = !s.done;
        if (s.done) {
          logEvent("done", { task: s.text, cat: "Personal" }, { learning: true });
          toast("\u{1F9E0} Smarter already");
        }
        save(true);
        render();
        break;
      }
      case "dellearn":
        S.learning = S.learning.filter((x) => x.id !== Number(id));
        save(true);
        render();
        break;
      case "test":
        testNotification();
        break;
      case "perm-notif":
        LocalNotifications.requestPermissions().then(refreshPerms).then(render);
        break;
      case "perm-exact":
        LocalNotifications.changeExactNotificationSetting().then(refreshPerms).then(() => {
          render();
          scheduleSync();
        });
        break;
      case "hidetip":
        S.hideTips[v] = true;
        save(true);
        render();
        break;
      case "copybk":
        copyText($("#bk-out").value);
        break;
      case "restore":
        restoreBackup();
        break;
      case "obdone":
        finishOnboarding();
        break;
    }
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    const id = ev.target.id;
    if (id === "quick") {
      ev.preventDefault();
      quickAdd();
    } else if (id === "client-quick") {
      ev.preventDefault();
      clientQuickAdd(Number(ev.target.dataset.cid));
    } else if (id === "shop-new") {
      ev.preventDefault();
      document.querySelector('[data-a="addshop"]').click();
    } else if (id === "learn-new") {
      ev.preventDefault();
      document.querySelector('[data-a="addlearn"]').click();
    } else if (ev.target.dataset.top3 !== void 0) ev.target.blur();
  });
  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.id === "quick") updatePreview();
    else if (t.id === "note-q") {
      view.noteQ = t.value;
      const pos = t.selectionStart;
      render();
      const n = $("#note-q");
      if (n) {
        n.focus();
        n.setSelectionRange(pos, pos);
      }
    } else if (t.id === "client-notes") {
      const c = clientById(t.dataset.cid);
      if (c) {
        c.notes = t.value;
        save();
      }
    } else if (t.dataset.j) {
      const k = dayKey(Date.now());
      S.journal[k] = Object.assign(S.journal[k] || {}, { [t.dataset.j]: t.value });
      save(true);
    }
  });
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.dataset.top3 !== void 0) {
      const i = Number(t.dataset.top3);
      while (S.top3.items.length <= i) S.top3.items.push({ text: "", done: false });
      S.top3.items[i].text = t.value.trim();
      save(true);
    } else if (t.dataset.set) {
      const k = t.dataset.set;
      let val = t.value;
      if (["nagMin", "maxNags", "snoozeMin", "reviewDay"].includes(k)) val = Number(val);
      if (k === "top3Checks") val = val === "true";
      S.settings[k] = val;
      save();
      if (k === "snoozeMin") initNative();
      toast("Saved \u2713");
    } else if (t.id === "f-rep") {
      $("#f-every-wrap").hidden = t.value !== "every";
    }
  });
  function quickAdd() {
    const q = $("#quick");
    const v = q.value.trim();
    if (!v) {
      reminderSheet();
      return;
    }
    const r = parseReminder(v);
    if (!r) {
      reminderSheet(null, { task: v.charAt(0).toUpperCase() + v.slice(1), cat: guessCategory(v) });
      q.value = "";
      return;
    }
    const client = S.clients.find((c) => r.task.toLowerCase().includes(c.name.toLowerCase()));
    if (client) r.clientId = client.id;
    const rem = addReminder(r);
    q.value = "";
    render();
    toast("Got it \u2705 " + fmtWhen(rem.due));
  }
  function clientQuickAdd(cid) {
    const inp = $("#client-quick");
    const v = inp.value.trim();
    if (!v) return;
    const r = parseReminder(v);
    if (!r) {
      reminderSheet(null, { task: v, cat: "Follow-up", clientId: cid });
      return;
    }
    r.clientId = cid;
    if (r.cat === "Personal" || r.cat === "Work") r.cat = "Follow-up";
    addReminder(r);
    render();
    toast("Follow-up set \u2705 " + fmtWhen(r.due));
  }
  async function testNotification() {
    if (!NATIVE) {
      toast("Test works inside the installed app");
      return;
    }
    try {
      await LocalNotifications.schedule({ notifications: [{ id: 99999, title: "\u{1F514} Lucy here!", body: "If you can see this, reminders are working \u2728", channelId: "lucy", smallIcon: "ic_stat_lucy", iconColor: "#FF5A6E", schedule: { at: new Date(Date.now() + 1e4), allowWhileIdle: true } }] });
      toast("Lock your phone, wait 10 seconds \u{1F514}");
    } catch (e) {
      toast("Could not schedule: " + e.message);
    }
  }
  function copyText(text) {
    const done = () => toast("\u{1F4CB} Copied. Paste it somewhere safe");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        fallbackCopy();
      });
    } else fallbackCopy();
    function fallbackCopy() {
      const t = $("#bk-out");
      t.removeAttribute("readonly");
      t.select();
      document.execCommand("copy");
      t.setAttribute("readonly", "");
      done();
    }
  }
  function restoreBackup() {
    const txt = $("#bk-in").value.trim();
    if (!txt) return toast("Paste your backup first");
    try {
      const d = JSON.parse(txt);
      if (!d || !Array.isArray(d.reminders)) throw new Error("bad");
      if (!confirm("Replace everything on this phone with the backup?")) return;
      localStorage.setItem(KEY, JSON.stringify(d));
      S = load();
      save();
      go("today");
      toast("\u2705 Restored");
    } catch (e) {
      toast("That doesn't look like a Lucy backup");
    }
  }
  function finishOnboarding() {
    S.settings.name = ($("#ob-name").value || "Divyesh").trim();
    const now = Date.now();
    const nextQuarter = Math.ceil((now + 5 * MIN) / (15 * MIN)) * 15 * MIN;
    if ($("#ob-water").checked) addReminder({ task: "Drink water", cat: "Health", due: nextQuarter, repeat: "every:60" });
    if ($("#ob-stand").checked) addReminder({ task: "Stand up & stretch", cat: "Health", due: nextQuarter + 15 * MIN, repeat: "every:45" });
    if ($("#ob-gym").checked) {
      const g = hm($("#ob-gymtime").value);
      let due = atTime(now, g.h, g.m);
      if (due <= now) due = addDays(due, 1);
      addReminder({ task: "Gym time \u{1F3CB}\uFE0F", cat: "Health", due, repeat: "daily" });
    }
    S.onboarded = true;
    save();
    closeSheet();
    if (NATIVE) LocalNotifications.requestPermissions().then(refreshPerms).then(render);
    render();
    toast("Welcome, " + name() + " \u2728");
  }
  (async function start() {
    normalize();
    render();
    await initNative();
    render();
    if (!S.onboarded) onboardingSheet();
    scheduleSync();
  })();
  window.__lucy = { get S() {
    return S;
  }, buildSchedule, render };
})();
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
