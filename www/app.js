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
    const today2 = new Date(now).getDay();
    let due = atTime(addDays(startOfDay(now), (dow - today2 + 7) % 7), t.h, t.min);
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
  var ROUTINE_DEFAULT = [
    { key: "wake", emoji: "\u23F0", label: "Wake up", time: "07:30", ring: true, say: "Good morning {name}! It is {time}. Time to wake up and win the day." },
    { key: "warmwater", emoji: "\u{1F375}", label: "Lukewarm water", time: "07:40", say: "{name}, time for your glass of lukewarm water." },
    { key: "gym", emoji: "\u{1F3CB}\uFE0F", label: "Gym", time: "08:00", say: "{name}, it is gym time. Let's go!" },
    { key: "breakfast", emoji: "\u{1F373}", label: "Breakfast", time: "09:00", say: "{name}, breakfast time." },
    { key: "water1", emoji: "\u{1F4A7}", label: "Drink water", time: "10:00", say: "{name}, drink some water." },
    { key: "coffee1", emoji: "\u2615", label: "Black coffee", time: "11:00", say: "{name}, black coffee time." },
    { key: "midmorning", emoji: "\u{1F34E}", label: "Mid-morning snack", time: "11:30", say: "{name}, time for your mid-morning snack." },
    { key: "water2", emoji: "\u{1F4A7}", label: "Drink water", time: "12:15", say: "{name}, drink some water." },
    { key: "lunch", emoji: "\u{1F35B}", label: "Lunch", time: "13:30", say: "{name}, it is lunch time." },
    { key: "water3", emoji: "\u{1F4A7}", label: "Drink water", time: "14:15", say: "{name}, drink some water." },
    { key: "afternoon", emoji: "\u{1F957}", label: "Afternoon snack", time: "16:00", say: "{name}, time for your afternoon snack." },
    { key: "water4", emoji: "\u{1F4A7}", label: "Drink water", time: "16:30", say: "{name}, drink some water." },
    { key: "coffee2", emoji: "\u2615", label: "Black coffee", time: "18:00", say: "{name}, black coffee time." },
    { key: "water5", emoji: "\u{1F4A7}", label: "Drink water", time: "18:30", say: "{name}, drink some water." },
    { key: "evening", emoji: "\u{1F96A}", label: "Evening snack", time: "19:30", say: "{name}, time for your evening snack." },
    { key: "water6", emoji: "\u{1F4A7}", label: "Drink water", time: "20:00", say: "{name}, drink some water." },
    { key: "dinner", emoji: "\u{1F37D}\uFE0F", label: "Dinner", time: "21:00", say: "{name}, dinner time." },
    { key: "walk", emoji: "\u{1F6B6}", label: "Long walk", time: "21:30", say: "{name}, time for your long walk." }
  ];
  var JOURNAL_QS = [
    { id: "rating", q: "How would I rate today?", emoji: "\u2B50", type: "rating" },
    { id: "smile", q: "What made me smile today?", emoji: "\u{1F60A}" },
    { id: "proud", q: "What am I most proud of today?", emoji: "\u{1F3C5}" },
    { id: "work", q: "Which client or work moment went well?", emoji: "\u{1F4BC}" },
    { id: "drain", q: "What drained my energy, and how can I avoid it?", emoji: "\u{1F50B}" },
    { id: "learn", q: "What did I learn today?", emoji: "\u{1F9E0}" },
    { id: "thanks", q: "Who helped me today? Did I thank them?", emoji: "\u{1F91D}" },
    { id: "inspire", q: "A shot, frame or idea that inspired me today", emoji: "\u{1F3A5}" },
    { id: "health", q: "What did I do for my health today?", emoji: "\u{1F4AA}" },
    { id: "love", q: "How did I show love to my family today?", emoji: "\u2764\uFE0F" },
    { id: "replay", q: "If I could replay today, what would I change?", emoji: "\u{1F501}" },
    { id: "grateful", q: "Three things I'm grateful for", emoji: "\u{1F64F}" },
    { id: "tomorrow", q: "My number one priority for tomorrow", emoji: "\u{1F3AF}" }
  ];
  var CAT_COLOR = {
    Work: "#3A86FF",
    "Follow-up": "#FF8A00",
    Meeting: "#7C5CFF",
    Money: "#12B886",
    Family: "#FF5CA8",
    Health: "#19C6B7",
    Home: "#F59F00",
    Documents: "#5C7CFA",
    Personal: "#E64980"
  };
  var SHOP_CATS = [["Company", "\u{1F3E2}"], ["Wife", "\u{1F49D}"], ["Family", "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}"], ["Personal", "\u{1F64B}"], ["Gadgets", "\u{1F4F1}"], ["Other", "\u{1F6CD}\uFE0F"]];
  var LEARN_CATS = [["AI", "\u{1F916}"], ["Books", "\u{1F4D6}"], ["YouTube", "\u25B6\uFE0F"], ["Practice", "\u{1F3AF}"], ["Crime", "\u{1F575}\uFE0F"], ["Food", "\u{1F372}"], ["Fitness", "\u{1F3C3}"], ["Coding", "\u{1F4BB}"], ["Tech", "\u{1F527}"]];
  var PERSONAL_CATS = ["Personal", "Family", "Health", "Home", "Documents"];
  var COMPANY_CATS = ["Work", "Meeting", "Follow-up", "Money"];
  function fill(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m);
  }
  function spokenTime(hhmm) {
    const [h, m] = String(hhmm).split(":").map(Number);
    const h12 = h % 12 || 12, ap = h >= 12 ? "PM" : "AM";
    return m ? `${h12} ${String(m).padStart(2, "0")} ${ap}` : `${h12} ${ap}`;
  }

  // src/celebrate.js
  var COLORS = ["#7C5CFF", "#FF5CA8", "#FFB547", "#19C6B7", "#3A86FF", "#12B886", "#FF8A00"];
  var tap = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  var canvas;
  var ctx;
  var parts = [];
  var running = false;
  function setTapPoint(x, y) {
    if (x || y) tap = { x, y };
  }
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.id = "fx";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    const size = () => {
      const d = window.devicePixelRatio || 1;
      canvas.width = innerWidth * d;
      canvas.height = innerHeight * d;
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    size();
    window.addEventListener("resize", size);
  }
  function loop() {
    if (!parts.length) {
      running = false;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      return;
    }
    running = true;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const now = performance.now();
    parts = parts.filter((p) => now - p.born < p.life && p.y < innerHeight + 60);
    parts.forEach((p) => {
      p.vy += p.g;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      const age = (now - p.born) / p.life;
      ctx.save();
      ctx.globalAlpha = age > 0.75 ? Math.max(0, 1 - (age - 0.75) / 0.25) : 1;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.emoji) {
        ctx.font = p.size + 'px system-ui, "Noto Color Emoji", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.emoji, 0, 0);
      } else {
        const w = p.size * Math.abs(Math.cos(p.rot * 2.3)) + 1;
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else ctx.fillRect(-w / 2, -p.size / 3, w, p.size * 0.66);
      }
      ctx.restore();
    });
    requestAnimationFrame(loop);
  }
  function burst(x, y, n, power) {
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (Math.random() * 0.6 + 0.4) * power;
      parts.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - power * 0.5,
        g: 0.18,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        size: 6 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        round: Math.random() < 0.3,
        born: now,
        life: 1400 + Math.random() * 600
      });
    }
  }
  function rain(emojis, n) {
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * innerWidth,
        y: -40 - Math.random() * innerHeight * 0.6,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 2 + Math.random() * 3,
        g: 0.06,
        rot: Math.random() - 0.5,
        vr: (Math.random() - 0.5) * 0.06,
        size: 24 + Math.random() * 18,
        emoji: emojis[i % emojis.length],
        born: now,
        life: 3200
      });
    }
  }
  function cannons() {
    const now = performance.now();
    [[0, innerHeight * 0.75, 1], [innerWidth, innerHeight * 0.75, -1]].forEach(([x, y, dir]) => {
      for (let i = 0; i < 70; i++) {
        const a = -Math.PI / 2 + dir * (0.25 + Math.random() * 0.55), s = 9 + Math.random() * 9;
        parts.push({
          x,
          y,
          vx: Math.cos(a) * s * dir * dir,
          vy: Math.sin(a) * s,
          g: 0.22,
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.5,
          size: 7 + Math.random() * 8,
          color: COLORS[i % COLORS.length],
          round: Math.random() < 0.25,
          born: now,
          life: 2600
        });
      }
    });
  }
  function celebrate(kind, opts) {
    opts = opts || {};
    ensureCanvas();
    if (kind === "small") burst(tap.x, tap.y, 34, 7);
    else if (kind === "rain") {
      rain(opts.emoji || ["\u2728", "\u{1F389}"], 28);
      burst(tap.x, tap.y, 24, 6);
    } else if (kind === "big") {
      cannons();
      setTimeout(() => burst(innerWidth / 2, innerHeight * 0.38, 60, 10), 250);
      showTrophy(opts);
    }
    if (!running) requestAnimationFrame(loop);
  }
  function showTrophy(o) {
    const old = document.getElementById("trophy");
    if (old) old.remove();
    const el = document.createElement("div");
    el.id = "trophy";
    el.innerHTML = `<div class="t-stage"><div class="t-glow"></div><div class="t-ring"></div><div class="t-icon">${o.icon || "\u{1F3C6}"}</div></div>
    <div class="t-title">${o.title || "Well done!"}</div><div class="t-sub">${o.sub || ""}</div><div class="t-tap">Tap to continue</div>`;
    document.body.appendChild(el);
    try {
      if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 120]);
    } catch (e) {
    }
    const close = () => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 300);
    };
    el.addEventListener("click", close);
    setTimeout(close, 3400);
  }

  // src/app.js
  var NATIVE = Capacitor.isNativePlatform();
  var Alarm = registerPlugin("LucyAlarm");
  var KEY = "lucy.data.v1";
  var DEFAULTS = {
    v: 2,
    settings: {
      name: "Divyesh",
      nagMin: 15,
      maxNags: 8,
      snoozeMin: 10,
      ringReminders: true,
      speak: true,
      briefTime: "08:30",
      top5Checks: true,
      journalTime: "22:00",
      reviewDay: 0,
      reviewTime: "19:00"
    },
    routine: ROUTINE_DEFAULT.map((r) => ({ key: r.key, emoji: r.emoji, label: r.label, time: r.time, on: true, ring: !!r.ring, speak: true })),
    routineLog: {},
    reminders: [],
    clients: [],
    payments: [],
    ideas: [],
    notes: [],
    shopping: [],
    learning: [],
    journal: {},
    log: [],
    celebrated: {},
    seq: 1,
    onboarded: false
  };
  var S = load();
  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }
  function load() {
    let d = null;
    try {
      d = JSON.parse(localStorage.getItem(KEY) || "null");
    } catch (e) {
      console.error(e);
    }
    if (!d) return clone(DEFAULTS);
    return migrate(d);
  }
  function migrate(d) {
    const out = Object.assign(clone(DEFAULTS), d);
    out.settings = Object.assign(clone(DEFAULTS.settings), d.settings || {});
    if (!d.v || d.v < 2) {
      out.reminders = (d.reminders || []).filter((r) => !String(r.repeat || "").startsWith("every:") && r.task !== "Gym time \u{1F3CB}\uFE0F");
      out.ideas = (d.notes || []).map((n) => ({ id: n.id, text: n.text, scope: "company", clientId: null, created: n.created, pinned: n.pinned }));
      out.notes = [];
      out.clients = (d.clients || []).map((c) => ({
        id: c.id,
        firstName: "",
        lastName: "",
        personalPhone: c.phone || "",
        company: c.name || "",
        businessType: c.business || "",
        address: "",
        companyPhone: "",
        work: "",
        pkg: "",
        email: "",
        instagram: "",
        facebook: "",
        gmb: "",
        notes: c.notes || "",
        created: c.created
      }));
      out.shopping = (d.shopping || []).map((s) => Object.assign({ cat: "Personal", created: Date.now() }, s));
      const map = { Watch: "YouTube", Read: "Books", Learn: "AI", Practice: "Practice" };
      out.learning = (d.learning || []).map((s) => Object.assign({}, s, { cat: map[s.type] || s.cat || "AI" }));
      delete out.top3;
      delete out.hideTips;
      out.v = 2;
    }
    if (!Array.isArray(out.routine) || !out.routine.length) out.routine = clone(DEFAULTS.routine);
    return out;
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
  function logEvent(kind, extra) {
    S.log.push(Object.assign({ t: Date.now(), kind }, extra || {}));
    if (S.log.length > 3e3) S.log = S.log.slice(-2500);
  }
  var $ = (s) => document.querySelector(s);
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function hm(str) {
    const p = String(str || "0:0").split(":");
    return { h: +p[0] || 0, m: +p[1] || 0 };
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
  function fmtHM(hhmm) {
    const t = hm(hhmm);
    return fmtTime(atTime(Date.now(), t.h, t.m));
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
  function buzz(p) {
    try {
      if (navigator.vibrate) navigator.vibrate(p);
    } catch (e) {
    }
  }
  var name = () => (S.settings.name || "").trim() || "there";
  var clientById = (id) => S.clients.find((c) => c.id === Number(id));
  var clientName = (c) => c ? c.company || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Client" : "";
  var personName = (c) => c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : "";
  var remById = (id) => S.reminders.find((r) => r.id === Number(id));
  var payById = (id) => S.payments.find((p) => p.id === Number(id));
  var isCal = (r) => ["daily", "weekly", "monthly", "yearly"].includes(r.repeat);
  var alertStart = (r) => Math.max(r.due, r.snoozeUntil || 0);
  var nagEnd = (r) => alertStart(r) + S.settings.maxNags * S.settings.nagMin * MIN;
  var today = () => dayKey(Date.now());
  var routineDone = (day) => S.routineLog[day || today()] || [];
  function doneToday() {
    const d0 = startOfDay(Date.now());
    return S.log.filter((e) => (e.kind === "done" || e.kind === "paid" || e.kind === "routine") && e.t >= d0).length;
  }
  function streak() {
    const days = new Set(S.log.filter((e) => e.kind === "done" || e.kind === "routine" || e.kind === "paid").map((e) => dayKey(e.t)));
    let n = 0, d = Date.now();
    if (!days.has(dayKey(d))) d = addDays(d, -1);
    while (days.has(dayKey(d))) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  }
  function speakNow(text) {
    if (NATIVE && S.settings.speak) Alarm.speak({ text }).catch(() => {
    });
  }
  function topFive() {
    const now = Date.now(), end = addDays(startOfDay(now), 1), end2 = addDays(end, 1);
    const items = [];
    S.reminders.forEach((r) => {
      if (r.status !== "pending") return;
      const t = alertStart(r);
      if (t >= end2) return;
      let score;
      if (t < now) score = 1e3 + Math.min(300, (now - t) / MIN / 10);
      else if (t < end) score = { Meeting: 800, Money: 700, "Follow-up": 650, Work: 550 }[r.cat] || 450;
      else score = 100;
      score -= Math.max(0, (t - now) / 36e5) * 4;
      items.push({ kind: "rem", id: r.id, score, t, tomorrow: t >= end });
    });
    S.payments.forEach((p) => {
      if (p.status !== "pending") return;
      const t = atTime(p.due, 10, 0);
      if (t >= end2) return;
      const score = p.due < startOfDay(now) ? 1e3 : t < end ? p.type === "in" ? 720 : 700 : 100;
      items.push({ kind: "pay", id: p.id, score, t, tomorrow: t >= end });
    });
    items.sort((a, b) => b.score - a.score || a.t - b.t);
    return items.slice(0, 5);
  }
  function todayPendingCount() {
    return topFive().filter((x) => !x.tomorrow).length;
  }
  function checkAllClear(before) {
    const k = today();
    S.celebrated[k] = S.celebrated[k] || {};
    if (before > 0 && todayPendingCount() === 0 && !S.celebrated[k].top5) {
      S.celebrated[k].top5 = true;
      save(true);
      setTimeout(() => celebrate("big", { icon: "\u{1F3C6}", title: "Top 5 cleared!", sub: "Everything for today is done, " + name() + ". Legend move." }), 350);
      speakNow("Amazing work " + name() + ". Everything for today is done.");
    }
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
  function markDone(id, quiet) {
    const r = remById(id);
    if (!r || r.status !== "pending") return;
    const before = todayPendingCount();
    logEvent("done", { task: r.task, cat: r.cat, clientId: r.clientId });
    if (r.repeat) {
      r.due = nextAfter(r, Math.max(r.due, Date.now()));
      r.snoozeUntil = 0;
      if (!quiet) toast(cheer(doneToday()) + " Next: " + fmtWhen(r.due));
    } else {
      r.status = "done";
      r.doneAt = Date.now();
      if (!quiet) toast(cheer(doneToday()));
    }
    save();
    if (!quiet) {
      celebrate("small");
      buzz(30);
    }
    checkAllClear(before);
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
    save();
    toast("\u{1F634} Snoozed till " + fmtTime(r.snoozeUntil));
  }
  function deleteReminder(id) {
    S.reminders = S.reminders.filter((r) => r.id !== Number(id));
    save();
  }
  function normalize() {
    const now = Date.now();
    let changed = false;
    S.reminders.forEach((r) => {
      if (r.status !== "pending" || !r.repeat) return;
      if (String(r.repeat).startsWith("every:") && r.due <= now) {
        r.due = nextAfter(r, now);
        changed = true;
        return;
      }
      if (isCal(r) && nagEnd(r) < now) {
        logEvent("missed", { task: r.task, cat: r.cat, clientId: r.clientId });
        r.due = nextAfter(r, now);
        r.snoozeUntil = 0;
        changed = true;
      }
    });
    if (changed) save(true);
  }
  function findClash(due, excludeId) {
    const from = due - 30 * MIN, to = due + 30 * MIN + 1;
    return S.reminders.filter((r) => r.status === "pending" && r.id !== excludeId && occurrencesBetween(r, from, to, 2).length).map((r) => ({ r, at: occurrencesBetween(r, from, to, 1)[0] }));
  }
  function routineToggle(key) {
    const k = today();
    const list = S.routineLog[k] = S.routineLog[k] || [];
    const item = S.routine.find((x) => x.key === key);
    if (list.includes(key)) {
      S.routineLog[k] = list.filter((x) => x !== key);
      for (let i = S.log.length - 1; i >= 0; i--) {
        if (S.log[i].kind === "routine" && S.log[i].key === key && dayKey(S.log[i].t) === k) {
          S.log.splice(i, 1);
          break;
        }
      }
      save();
      return;
    }
    list.push(key);
    logEvent("routine", { key, task: item ? item.label : key, cat: "Health" });
    save();
    celebrate("small");
    buzz(25);
    const active = S.routine.filter((x) => x.on);
    S.celebrated[k] = S.celebrated[k] || {};
    if (active.length && active.every((x) => S.routineLog[k].includes(x.key)) && !S.celebrated[k].routine) {
      S.celebrated[k].routine = true;
      save(true);
      setTimeout(() => celebrate("big", { icon: "\u{1F31F}", title: "Routine complete!", sub: "All " + active.length + " habits done today. Your body says thank you." }), 300);
      speakNow("Wow " + name() + ". Your full routine is complete today.");
    } else toast(item ? item.emoji + " " + item.label + " \u2713" : "Done \u2713");
  }
  function settlePayment(id, quiet) {
    const p = payById(id);
    if (!p || p.status !== "pending") return;
    const before = todayPendingCount();
    p.status = "settled";
    p.settledAt = Date.now();
    logEvent("paid", { task: (p.type === "in" ? "Received " : "Paid ") + money(p.amount) + (p.type === "in" ? " from " : " to ") + p.party, cat: "Money", amount: p.amount, dir: p.type, clientId: p.clientId });
    save();
    if (!quiet) {
      if (p.type === "in") {
        celebrate("rain", { emoji: ["\u{1F4B0}", "\u{1F4B5}", "\u{1FA99}"] });
        toast("\u{1F4B0} Money in! " + money(p.amount));
        buzz([40, 60, 40]);
      } else {
        celebrate("small");
        toast("\u2705 Paid " + money(p.amount));
      }
    }
    checkAllClear(before);
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
      await applyNativeActions(true);
      normalize();
      await Alarm.setSpeak({ on: !!S.settings.speak });
      await Alarm.setAll({ alarms: buildSchedule() });
    } catch (e) {
      console.error("sync failed", e);
    }
    syncing = false;
    if (syncAgain) {
      syncAgain = false;
      sync();
    }
  }
  function hashId(str) {
    let h = 7;
    for (let i = 0; i < str.length; i++) h = h * 31 + str.charCodeAt(i) | 0;
    return 1e5 + Math.abs(h) % 7e5;
  }
  function buildSchedule() {
    const st = S.settings, now = Date.now(), horizon = addDays(now, 7);
    const out = [];
    const push = (o) => {
      if (o.at > now + 2e3 && o.at <= horizon) out.push(o);
    };
    const nm = name();
    S.reminders.forEach((r) => {
      if (r.status !== "pending") return;
      const client = r.clientId ? clientById(r.clientId) : null;
      const who = client ? " \xB7 " + clientName(client) : "";
      const emoji = taskEmoji(r.task, r.cat);
      const occs = [r.due].concat(r.repeat ? occurrencesBetween(r, r.due + 1, horizon, 30) : []);
      occs.forEach((occ, oi) => {
        const group = "rem:" + r.id + ":" + occ;
        const start2 = oi === 0 ? alertStart(r) : occ;
        const next = occs[oi + 1] || Infinity;
        for (let k = 0; k <= st.maxNags; k++) {
          const t = start2 + k * st.nagMin * MIN;
          if (t >= next) break;
          const n = nagText(nm, emoji + " " + r.task + who, k, st.maxNags);
          push({
            at: t,
            title: n.title,
            body: n.body,
            group,
            notifId: hashId(group),
            insistent: !!st.ringReminders,
            actions: "REMIND",
            snoozeMin: st.snoozeMin,
            speech: k === 0 ? nm + ", reminder. " + r.task + (client ? ", with " + clientName(client) : "") : k % 2 === 1 ? nm + ", still pending. " + r.task : "",
            extra: { kind: "rem", rid: r.id, occ }
          });
        }
        if (oi === 0 && r.cat === "Meeting" && client && client.notes) {
          push({
            at: start2 - 30 * MIN,
            title: "\u{1F91D} In 30 min: " + r.task,
            body: client.notes.slice(0, 300),
            group: "prep:" + r.id,
            channel: "remind",
            speech: nm + ", in 30 minutes, " + r.task + ".",
            extra: { kind: "client", cid: client.id }
          });
        }
      });
    });
    for (let i = 0; i < 7; i++) {
      const day = addDays(startOfDay(now), i), dk = dayKey(day);
      S.routine.forEach((it) => {
        if (!it.on || routineDone(dk).includes(it.key)) return;
        const t = hm(it.time), at = atTime(day, t.h, t.m);
        const def = ROUTINE_DEFAULT.find((d) => d.key === it.key);
        const say = def ? fill(def.say, { name: nm, time: spokenTime(it.time) }) : nm + ", time for " + it.label;
        const group = "routine:" + it.key + ":" + dk;
        push({
          at,
          title: it.emoji + " " + it.label,
          body: it.ring ? "Tap Done to stop the alarm." : fmtHM(it.time) + " \xB7 tap Done when finished",
          group,
          notifId: hashId(group),
          insistent: !!it.ring,
          actions: "REMIND",
          snoozeMin: st.snoozeMin,
          channel: "remind",
          speech: it.speak ? say : "",
          extra: { kind: "routine", key: it.key, day: dk }
        });
      });
    }
    S.payments.forEach((p) => {
      if (p.status !== "pending") return;
      const verb = p.type === "in" ? "Collect " + money(p.amount) + " from " + p.party : "Pay " + money(p.amount) + " to " + p.party;
      const spoken = p.type === "in" ? "collect " + Math.round(p.amount) + " rupees from " + p.party : "pay " + Math.round(p.amount) + " rupees to " + p.party;
      const from = p.snoozeUntil || 0;
      const dayBefore = atTime(addDays(p.due, -1), 19, 0);
      if (dayBefore >= from) push({ at: dayBefore, title: "\u{1F4B0} Tomorrow: " + verb, body: p.note || "Heads-up from Lucy", channel: "remind", group: "payb:" + p.id, extra: { kind: "pay", pid: p.id } });
      for (let i = 0; i < 7; i++) {
        const t = atTime(addDays(p.due, i), 10, 0);
        if (t < from) continue;
        const group = "pay:" + p.id + ":" + i;
        push({
          at: t,
          title: i === 0 ? "\u{1F4B0} Today: " + verb : "\u26A0\uFE0F Overdue " + i + "d: " + verb,
          body: p.note || (p.type === "in" ? "Time to follow up \u{1F4DE}" : "Don't let it slip"),
          group,
          notifId: hashId("pay:" + p.id),
          insistent: !!st.ringReminders,
          actions: "PAY",
          speech: nm + ", today, " + spoken + ".",
          extra: { kind: "pay", pid: p.id }
        });
      }
    });
    for (let i = 0; i < 7; i++) {
      const day = addDays(startOfDay(now), i);
      const b = hm(st.briefTime), bAt = atTime(day, b.h, b.m);
      const brief = briefText(day);
      push({ at: bAt, title: "\u2600\uFE0F " + greeting(nm, bAt), body: brief, channel: "quiet", group: "brief", speech: greeting(nm, bAt) + ". " + brief.replace(/•/g, ". ").replace(/₹/g, "rupees "), extra: { kind: "open", tab: "today" } });
      if (st.top5Checks) {
        [14, 18].forEach((h) => push({ at: atTime(day, h, 0), title: "\u{1F3AF} Top 5 check-in", body: h === 14 ? "Halfway through the day. How is your Top 5 going?" : "Evening check: clear your Top 5 before the day ends.", channel: "quiet", group: "check", extra: { kind: "open", tab: "today" } }));
      }
      const j = hm(st.journalTime);
      push({ at: atTime(day, j.h, j.m), title: "\u{1F319} Journal time", body: "Five calm minutes. " + JOURNAL_QS.length + " questions about your day.", channel: "quiet", group: "journal", extra: { kind: "open", tab: "more", sub: "journal" } });
      if (new Date(day).getDay() === Number(st.reviewDay)) {
        const rv = hm(st.reviewTime);
        push({ at: atTime(day, rv.h, rv.m), title: "\u{1F4CA} Your weekly review is ready", body: "Personal, company, shopping and ideas: see your week.", channel: "quiet", group: "review", extra: { kind: "open", tab: "more", sub: "review" } });
      }
    }
    out.sort((a, b) => a.at - b.at);
    return out.slice(0, 450).map((n, i) => Object.assign({ id: i + 1 }, n));
  }
  function briefText(day) {
    const end = addDays(day, 1);
    const rems = S.reminders.filter((r) => r.status === "pending" && occurrencesBetween(r, day, end, 3).length);
    const pays = S.payments.filter((p) => p.status === "pending" && p.due < end);
    const collect = pays.filter((p) => p.type === "in").reduce((a, p) => a + Number(p.amount), 0);
    const pay = pays.filter((p) => p.type === "out").reduce((a, p) => a + Number(p.amount), 0);
    const parts2 = [];
    if (rems.length) parts2.push(rems.length + " reminder" + (rems.length > 1 ? "s" : "") + ": " + rems.slice(0, 3).map((r) => r.task).join(", ") + (rems.length > 3 ? "\u2026" : ""));
    if (collect) parts2.push(money(collect) + " to collect");
    if (pay) parts2.push(money(pay) + " to pay");
    if (!parts2.length) parts2.push("A clear day. Focus on your routine and creative work");
    return parts2.join(" \u2022 ");
  }
  async function applyNativeActions(silent) {
    if (!NATIVE) return;
    let list = [];
    try {
      list = JSON.parse((await Alarm.takeActions()).json || "[]");
    } catch (e) {
      return;
    }
    if (!list.length) return;
    list.forEach((a) => {
      const ex = a.extra || {};
      if (ex.kind === "rem") {
        const r = remById(ex.rid);
        if (!r || r.status !== "pending" || r.repeat && r.due !== ex.occ) return;
        if (a.act === "done") markDone(r.id, true);
        else if (a.act === "snooze" && a.until) r.snoozeUntil = a.until;
      } else if (ex.kind === "routine") {
        if (a.act === "done") {
          const lst = S.routineLog[ex.day] = S.routineLog[ex.day] || [];
          if (!lst.includes(ex.key)) {
            lst.push(ex.key);
            logEvent("routine", { key: ex.key, task: (S.routine.find((x) => x.key === ex.key) || {}).label || ex.key, cat: "Health", t: a.t });
          }
        }
      } else if (ex.kind === "pay") {
        const p = payById(ex.pid);
        if (!p) return;
        if (a.act === "done") settlePayment(p.id, true);
        else if (a.act === "snooze") p.snoozeUntil = startOfDay(addDays(Date.now(), 1));
      }
    });
    save(true);
    if (!silent) render();
  }
  var perm = { notif: "granted", exact: "granted", battery: true };
  async function refreshPerms() {
    if (!NATIVE) return;
    try {
      perm.notif = (await LocalNotifications.checkPermissions()).display;
    } catch (e) {
    }
    try {
      perm.exact = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm;
    } catch (e) {
    }
    try {
      perm.battery = (await Alarm.batteryStatus()).ignoring;
    } catch (e) {
    }
  }
  async function initNative() {
    if (!NATIVE) return;
    try {
      Alarm.addListener("actions", () => applyNativeActions(false).then(scheduleSync));
      App.addListener("resume", async () => {
        await applyNativeActions(true);
        normalize();
        await refreshPerms();
        render();
        scheduleSync();
      });
      App.addListener("backButton", () => {
        if (!$("#sheet-wrap").hidden) {
          closeSheet();
          render();
          return;
        }
        if (view.sub || view.clientId) {
          view.sub = null;
          view.clientId = null;
          render();
          return;
        }
        if (view.tab !== "today") {
          go("today");
          return;
        }
        App.minimizeApp();
      });
      try {
        const p = await LocalNotifications.getPending();
        if (p.notifications.length) await LocalNotifications.cancel({ notifications: p.notifications.map((n) => ({ id: n.id })) });
      } catch (e) {
      }
      await refreshPerms();
      if (perm.notif !== "granted" && S.onboarded) {
        await LocalNotifications.requestPermissions();
        await refreshPerms();
      }
      await applyNativeActions(true);
    } catch (e) {
      console.error(e);
    }
  }
  var view = { tab: "today", sub: null, clientId: null, filter: "All", moneyTab: "in", ideaTab: "company", ideaQ: "", shopCat: "Personal", learnCat: "AI", reviewTab: "personal" };
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
    const fab = view.tab !== "more" || ["ideas", "notes", "shopping", "learning"].includes(view.sub);
    if (fab && !$(".fab")) document.body.insertAdjacentHTML("beforeend", '<button class="fab" data-a="fab" aria-label="Add">+</button>');
    if (!fab && $(".fab")) $(".fab").remove();
  }
  function catStyle(cat) {
    return `style="--c:${CAT_COLOR[cat] || "#7C5CFF"}"`;
  }
  function remRow(r, opts) {
    opts = opts || {};
    const now = Date.now();
    const client = r.clientId ? clientById(r.clientId) : null;
    const t = alertStart(r);
    const late = r.status === "pending" && t < now;
    const soon = !late && r.status === "pending" && t - now < 60 * MIN;
    const when = r.status === "done" ? "Done " + fmtWhen(r.doneAt || r.due) : opts.timeOnly ? fmtTime(t) : fmtWhen(t);
    const meta = [when];
    if (r.repeat) meta.push("\u{1F501} " + repeatLabel(r));
    if (client) meta.push("\u{1F91D} " + clientName(client));
    if (r.snoozeUntil > now) meta.push("\u{1F634} snoozed");
    return `<div class="item cat ${opts.cls || ""} ${r.status === "done" ? "done" : ""}" ${catStyle(r.cat)}>
    <button class="check ${r.status === "done" ? "on" : ""}" data-a="${r.status === "done" ? "undo" : "done"}" data-id="${r.id}">${r.status === "done" ? "\u2713" : ""}</button>
    <div class="bubble">${taskEmoji(r.task, r.cat)}</div>
    <div class="grow" data-a="edit" data-id="${r.id}">
      <div class="title">${esc(r.task)}</div>
      <div class="meta ${late ? "late" : soon ? "soon" : ""}">${esc(meta.join(" \xB7 "))}</div>
    </div></div>`;
  }
  function payRow(p, opts) {
    opts = opts || {};
    const now = Date.now();
    const late = p.status === "pending" && atTime(p.due, 23, 59) < now;
    const dueTxt = p.status === "settled" ? "Settled " + fmtDate(p.settledAt) : (late ? "Overdue \xB7 " : "Due ") + fmtDate(p.due);
    return `<div class="item cat ${opts.cls || ""}" ${catStyle("Money")}>
    ${opts.check ? `<button class="check" data-a="settle" data-id="${p.id}"></button>` : ""}
    <div class="bubble">${p.type === "in" ? "\u2B07\uFE0F" : "\u2B06\uFE0F"}</div>
    <div class="grow" data-a="editpay" data-id="${p.id}">
      <div class="title">${opts.check ? p.type === "in" ? "Collect from " : "Pay " : ""}${esc(p.party)}</div>
      <div class="meta ${late ? "late" : ""}">${esc(dueTxt)}${p.note ? " \xB7 " + esc(p.note) : ""}</div>
    </div>
    <div style="text-align:right">
      <div class="amount ${p.type}">${money(p.amount)}</div>
      ${p.status === "pending" && !opts.check ? `<button class="link" data-a="settle" data-id="${p.id}">${p.type === "in" ? "Received" : "Paid"}</button>` : ""}
    </div></div>`;
  }
  var listOf = (rows, emptyMsg) => rows.length ? `<div class="list">${rows.join("")}</div>` : emptyMsg ? `<div class="empty">${emptyMsg}</div>` : "";
  function renderToday() {
    const now = Date.now(), d0 = startOfDay(now), d1 = addDays(d0, 1);
    const top = topFive();
    const topIds = new Set(top.filter((x) => x.kind === "rem").map((x) => x.id));
    const topPay = new Set(top.filter((x) => x.kind === "pay").map((x) => x.id));
    const pendingToday = S.reminders.filter((r) => r.status === "pending" && alertStart(r) < d1 && !topIds.has(r.id)).sort((a, b) => alertStart(a) - alertStart(b));
    const doneT = S.reminders.filter((r) => r.status === "done" && r.doneAt >= d0);
    const pays = S.payments.filter((p) => p.status === "pending" && p.due < addDays(d0, 3) && !topPay.has(p.id)).sort((a, b) => a.due - b.due);
    const left = todayPendingCount() + pendingToday.length;
    const st = streak(), dn = doneToday();
    const act = S.routine.filter((x) => x.on), rdone = routineDone();
    const rCount = act.filter((x) => rdone.includes(x.key)).length;
    let mood;
    if (!S.reminders.length && !S.payments.length) mood = "Tap + to give me your first reminder. I'll handle the rest \u2728";
    else if (left === 0) mood = dn ? "All clear for today. Proud of you \u2728" : "Nothing pending today. Enjoy the calm \u2615";
    else if (top.filter((x) => x.score >= 1e3).length >= 3) mood = "A few things are overdue. Let's clear them one by one \u{1F4AA}";
    else mood = left + " thing" + (left > 1 ? "s" : "") + " on today's list. You've got this.";
    const tnow = new Date(now).getHours() * 60 + new Date(now).getMinutes();
    const mins = (it) => {
      const t = hm(it.time);
      return t.h * 60 + t.m;
    };
    const dueItems = act.filter((it) => mins(it) <= tnow && !rdone.includes(it.key)).slice(-3);
    const nextItems = act.filter((it) => mins(it) > tnow && !rdone.includes(it.key)).slice(0, 6 - dueItems.length);
    const rRows = dueItems.concat(nextItems).map((it) => `
    <button class="rchip ${mins(it) <= tnow ? "due" : ""}" data-a="routine" data-k="${it.key}">
      <span class="remo">${it.emoji}</span><span class="rt">${fmtHM(it.time)}</span><span class="rl">${esc(it.label)}</span>
    </button>`).join("");
    const topRows = top.map((x) => {
      if (x.kind === "pay") return payRow(payById(x.id), { check: true, cls: "top" });
      const r = remById(x.id);
      return remRow(r, { timeOnly: !x.tomorrow && alertStart(r) >= d0, cls: "top" + (x.tomorrow ? " tmr" : "") });
    });
    return `
    ${banners()}
    <div class="hero">
      <div class="lucy-badge"><img class="lucy-logo" src="lucy-icon.png" alt="">Lucy \xB7 ${DAYNAME[new Date(now).getDay()]}, ${new Date(now).getDate()} ${MON[new Date(now).getMonth()]}</div>
      <h1>${esc(greeting(name(), now))}</h1>
      <div class="sub">${esc(mood)}</div>
      <div class="chips"><span class="chip">\u2705 ${dn} done today</span>${st > 1 ? `<span class="chip">\u{1F525} ${st}-day streak</span>` : ""}${act.length ? `<span class="chip">\u{1F33F} Routine ${rCount}/${act.length}</span>` : ""}</div>
    </div>

    <h2>\u{1F3AF} Top 5 \xB7 picked by Lucy</h2>
    ${topRows.length ? `<div class="list">${topRows.join("")}</div>` : `<div class="empty card">Nothing urgent. Your Top 5 fills up automatically from your reminders, follow-ups and payments.</div>`}

    ${act.length ? `<h2>\u{1F33F} Daily routine \xB7 ${rCount}/${act.length}</h2>
      <div class="bar big"><i style="width:${Math.round(100 * rCount / act.length)}%"></i></div>
      <div class="rgrid">${rRows || '<div class="empty">Routine finished for today \u{1F31F}</div>'}</div>` : ""}

    ${pendingToday.length ? `<h2>\u{1F4C5} Also today</h2>${listOf(pendingToday.map((r) => remRow(r, { timeOnly: alertStart(r) >= d0 })))}` : ""}
    ${pays.length ? `<h2>\u{1F4B0} Money due soon</h2>${listOf(pays.map((p) => payRow(p)))}` : ""}
    ${doneT.length ? `<h2>\u2705 Done today</h2>${listOf(doneT.map((r) => remRow(r)))}` : ""}
  `;
  }
  function banners() {
    if (!NATIVE) return "";
    let h = "";
    if (perm.notif !== "granted") h += `<div class="banner">\u{1F515} Notifications are off, so I can't remind you.<br><button class="btn small" data-a="perm-notif">Turn on notifications</button></div>`;
    if (perm.exact && perm.exact !== "granted") h += `<div class="banner">\u23F1 Allow "Alarms &amp; reminders" so I ring exactly on time.<br><button class="btn small" data-a="perm-exact">Allow</button></div>`;
    if (!perm.battery) h += `<div class="banner">\u{1F50B} <b>Important:</b> let Lucy run in the background, or your phone may silence my alarms.<br><button class="btn small" data-a="battery">Allow background running</button></div>`;
    return h;
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
    const count = (x) => S.reminders.filter((r) => r.status === "pending" && (x === "All" || (x === "Repeating" ? !!r.repeat : r.cat === x))).length;
    const filters = ["All"].concat(CATS, ["Repeating"]);
    const body = groups.filter((g) => g[1].length).map((g) => `<h2 class="${g[0].includes("Overdue") ? "late" : ""}">${g[0]}</h2>${listOf(g[1].map((r) => remRow(r)))}`).join("");
    return `
    <h1>Reminders</h1><div class="sub">${pend.length} pending${f !== "All" ? " in " + f : ""}</div>
    <div class="fgrid">${filters.map((x) => `<button class="ftab ${x === f ? "on" : ""}" data-a="filter" data-v="${x}" ${x !== "All" && x !== "Repeating" ? catStyle(x) : ""}>
      <span>${x === "All" ? "\u{1F4CB}" : x === "Repeating" ? "\u{1F501}" : CAT_EMOJI[x]}</span><b>${x}</b><small>${count(x)}</small></button>`).join("")}</div>
    ${body || '<div class="empty">Nothing here yet. Tap + to add a reminder.</div>'}
    ${done.length ? `<h2>\u2705 Recently done</h2>${listOf(done.map((r) => remRow(r)))}` : ""}
  `;
  }
  function renderClients() {
    if (view.clientId) return renderClient(clientById(view.clientId));
    const rows = S.clients.slice().sort((a, b) => clientName(a).localeCompare(clientName(b))).map((c, i) => {
      const fu = S.reminders.filter((r) => r.clientId === c.id && r.status === "pending").length;
      const due = S.payments.filter((p) => p.status === "pending" && p.clientId === c.id && p.type === "in").reduce((a, p) => a + Number(p.amount), 0);
      const hue = ["#3A86FF", "#7C5CFF", "#FF5CA8", "#19C6B7", "#FF8A00", "#12B886"][i % 6];
      return `<div class="item" data-a="client" data-id="${c.id}">
      <div class="avatar" style="background:${hue}">${esc(clientName(c).charAt(0).toUpperCase())}</div>
      <div class="grow"><div class="title">${esc(clientName(c))}</div>
      <div class="meta">${esc([c.businessType, personName(c)].filter(Boolean).join(" \xB7 ") || "Client")}${fu ? " \xB7 " + fu + " follow-up" + (fu > 1 ? "s" : "") : ""}${due ? " \xB7 " + money(due) + " due" : ""}</div></div><span class="sub">\u203A</span></div>`;
    });
    return `<h1>Clients</h1><div class="sub">${S.clients.length} client${S.clients.length === 1 ? "" : "s"} \xB7 follow-ups, notes and money</div>
    <button class="btn block" data-a="newclient">+ Add client</button>
    <h2>All clients</h2>${listOf(rows, "No clients yet. Add your first one above.")}`;
  }
  function linkUrl(kind, v) {
    v = String(v || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    const h = v.replace(/^@/, "");
    if (kind === "instagram") return "https://instagram.com/" + h;
    if (kind === "facebook") return "https://facebook.com/" + h;
    if (kind === "gmb") return "https://www.google.com/search?q=" + encodeURIComponent(v);
    return v;
  }
  function telOf(p) {
    return String(p || "").replace(/[^\d+]/g, "");
  }
  function waOf(p) {
    const t = telOf(p);
    return t.startsWith("+") ? t.slice(1) : t.length === 10 ? "91" + t : t;
  }
  function renderClient(c) {
    if (!c) {
      view.clientId = null;
      return renderClients();
    }
    const rems = S.reminders.filter((r) => r.clientId === c.id && r.status === "pending").sort((a, b) => alertStart(a) - alertStart(b));
    const doneR = S.reminders.filter((r) => r.clientId === c.id && r.status === "done").slice(-5).reverse();
    const pays = S.payments.filter((p) => p.clientId === c.id).sort((a, b) => a.status === b.status ? a.due - b.due : a.status === "pending" ? -1 : 1);
    const btn = (href, label, cls) => href ? `<a class="btn small ${cls || "ghost"}" href="${esc(href)}">${label}</a>` : "";
    const details = [
      ["\u{1F464}", "Contact person", personName(c)],
      ["\u{1F4F1}", "Personal number", c.personalPhone],
      ["\u{1F3F7}\uFE0F", "Business type", c.businessType],
      ["\u{1F4CD}", "Address", c.address],
      ["\u260E\uFE0F", "Company number", c.companyPhone],
      ["\u{1F3AC}", "Work we do", c.work],
      ["\u{1F4E6}", "Package", c.pkg],
      ["\u2709\uFE0F", "Email", c.email]
    ].filter((d) => d[2]);
    return `
    <button class="back" data-a="back">\u2039 Clients</button>
    <div class="hero"><h1>${esc(clientName(c))}</h1>
      <div class="sub">${esc([c.businessType, personName(c)].filter(Boolean).join(" \xB7 "))}</div>
      <div class="actions">
        ${btn(c.personalPhone ? "tel:" + telOf(c.personalPhone) : "", "\u{1F4DE} Call", "solid")}
        ${btn(c.companyPhone ? "tel:" + telOf(c.companyPhone) : "", "\u260E\uFE0F Office")}
        ${btn(c.personalPhone || c.companyPhone ? "https://wa.me/" + waOf(c.personalPhone || c.companyPhone) : "", "\u{1F4AC} WhatsApp")}
        ${btn(c.email ? "mailto:" + c.email : "", "\u2709\uFE0F Email")}
        ${btn(linkUrl("instagram", c.instagram), "\u{1F4F8} Instagram")}
        ${btn(linkUrl("facebook", c.facebook), "\u{1F44D} Facebook")}
        ${btn(linkUrl("gmb", c.gmb), "\u{1F4CD} Google")}
        <button class="btn small ghost" data-a="editclient" data-id="${c.id}">\u270F\uFE0F Edit</button>
      </div>
    </div>
    ${details.length ? `<div class="list">${details.map((d) => `<div class="item"><div class="bubble plain">${d[0]}</div><div class="grow"><div class="meta">${d[1]}</div><div class="title" style="font-weight:500">${esc(d[2])}</div></div></div>`).join("")}</div>` : ""}
    <h2>\u{1F4DD} Notes &amp; meeting prep</h2>
    <textarea id="client-notes" data-cid="${c.id}" placeholder="What do they want? Budget? Last discussion? Lucy reads this to you 30 minutes before any meeting with ${esc(clientName(c))}.">${esc(c.notes || "")}</textarea>
    <h2>\u{1F4DE} Follow-ups</h2>
    <div class="quick"><input id="client-quick" placeholder="e.g. monday 11am send quotation" data-cid="${c.id}"><button class="btn" data-a="clientadd" data-id="${c.id}">Add</button></div>
    <div style="height:8px"></div>
    ${listOf(rems.map((r) => remRow(r)), "No pending follow-ups.")}
    <h2>\u{1F4B0} Payments</h2>
    <button class="btn small ghost" data-a="newpay" data-cid="${c.id}">+ Add payment</button><div style="height:8px"></div>
    ${listOf(pays.map((p) => payRow(p)), "No payments recorded.")}
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
      <div class="stat g-green"><div class="l">To receive</div><div class="n">${money(sum(inP))}</div><div class="s">${lateIn.length ? lateIn.length + " overdue" : inP.length + " pending"}</div></div>
      <div class="stat g-orange"><div class="l">To pay</div><div class="n">${money(sum(outP))}</div><div class="s">${lateOut.length ? lateOut.length + " overdue" : outP.length + " pending"}</div></div>
    </div>
    <div class="seg"><button class="${tab === "in" ? "on" : ""}" data-a="mtab" data-v="in">\u2B07\uFE0F To receive</button><button class="${tab === "out" ? "on" : ""}" data-a="mtab" data-v="out">\u2B06\uFE0F To pay</button></div>
    <h2>Pending</h2>${listOf(list.map((p) => payRow(p)), tab === "in" ? "Nobody owes you anything right now \u{1F389}" : "No bills pending \u{1F389}")}
    ${settled.length ? `<h2>Settled</h2>${listOf(settled.map((p) => payRow(p)))}` : ""}
    <div class="sub" style="margin:14px 4px">\u{1F4A1} For monthly bills like rent, EMI or SIP, add a repeating reminder in the Money category.</div>`;
  }
  function renderMore() {
    const subs = { ideas: renderIdeas, notes: renderNotes, shopping: renderShopping, learning: renderLearning, journal: renderJournal, review: renderReview, settings: renderSettings, backup: renderBackup };
    if (view.sub && subs[view.sub]) return '<button class="back" data-a="back">\u2039 More</button>' + subs[view.sub]();
    const jk = S.journal[today()] || {};
    const jAns = JOURNAL_QS.filter((q) => jk[q.id]).length;
    const row = (sub, icon, color, title, small) => `<button class="mrow" data-a="sub" data-v="${sub}"><span class="micon" style="background:${color}">${icon}</span><span class="grow"><b>${title}</b><small>${small}</small></span><span class="sub">\u203A</span></button>`;
    return `<h1>More</h1><div class="sub">Lucy's second brain</div><div style="height:14px"></div>
    ${row("ideas", "\u{1F4A1}", "linear-gradient(135deg,#FFB547,#FF8A00)", "Ideas", S.ideas.length + " ideas \xB7 company &amp; brands")}
    ${row("notes", "\u{1F4DD}", "linear-gradient(135deg,#5C7CFA,#3A86FF)", "Notes", S.notes.length + " notes \xB7 big writing space")}
    ${row("shopping", "\u{1F6D2}", "linear-gradient(135deg,#FF5CA8,#E64980)", "Shopping list", S.shopping.filter((s) => !s.done).length + " to buy")}
    ${row("learning", "\u{1F4DA}", "linear-gradient(135deg,#19C6B7,#12B886)", "Learning", S.learning.filter((s) => !s.done).length + " in queue")}
    ${row("journal", "\u{1F319}", "linear-gradient(135deg,#7C5CFF,#B15CFF)", "Journal", jAns ? jAns + "/" + JOURNAL_QS.length + " answered today" : JOURNAL_QS.length + " questions for today")}
    ${row("review", "\u{1F4CA}", "linear-gradient(135deg,#3A86FF,#7C5CFF)", "Weekly review", "Personal \xB7 Company \xB7 Shopping \xB7 Ideas")}
    ${row("settings", "\u2699\uFE0F", "linear-gradient(135deg,#868E96,#495057)", "Settings", "Daily routine, alarms, voice")}
    ${row("backup", "\u{1F4BE}", "linear-gradient(135deg,#12B886,#0CA678)", "Backup", "Keep your data safe")}`;
  }
  function renderIdeas() {
    const q = view.ideaQ.toLowerCase(), tab = view.ideaTab;
    const list = S.ideas.filter((n) => n.scope === tab && (!q || n.text.toLowerCase().includes(q))).sort((a, b) => b.pinned - a.pinned || b.created - a.created);
    const fmt = (t) => esc(t).replace(/#(\w+)/g, '<span class="tag">#$1</span>');
    return `<h1>\u{1F4A1} Ideas</h1><div class="sub">Reel ideas, hooks, campaign concepts</div><div style="height:12px"></div>
    <div class="seg"><button class="${tab === "company" ? "on" : ""}" data-a="itab" data-v="company">\u{1F3E2} Our company</button><button class="${tab === "brand" ? "on" : ""}" data-a="itab" data-v="brand">\u{1F91D} Brands we manage</button></div>
    ${tab === "brand" ? `<label>Which brand?</label><select id="idea-client"><option value="">Choose a client</option>${S.clients.map((c) => `<option value="${c.id}">${esc(clientName(c))}</option>`).join("")}</select>` : ""}
    <label>New idea</label><textarea id="idea-new" placeholder="${tab === "company" ? "e.g. Reel: 3 mistakes cafes make with Instagram #reel" : "e.g. Festive offer reel with slow-motion pour shots"}"></textarea>
    <button class="btn block" data-a="addidea">Save idea</button>
    <h2>${tab === "company" ? "DZYN LAB ideas" : "Brand ideas"} \xB7 ${list.length}</h2>
    <input id="idea-q" placeholder="Search ideas" value="${esc(view.ideaQ)}"><div style="height:8px"></div>
    ${listOf(list.map((n) => {
      const c = n.clientId ? clientById(n.clientId) : null;
      return `<div class="item"><div class="grow" data-a="editidea" data-id="${n.id}">
      <div class="note-text">${n.pinned ? "\u{1F4CC} " : ""}${fmt(n.text)}</div><div class="meta">${c ? "\u{1F91D} " + esc(clientName(c)) + " \xB7 " : ""}${fmtDate(n.created)}</div></div></div>`;
    }), "No ideas here yet.")}`;
  }
  function renderNotes() {
    const list = S.notes.filter((n) => n.title || n.body).sort((a, b) => b.pinned - a.pinned || b.updated - a.updated);
    return `<h1>\u{1F4DD} Notes</h1><div class="sub">Meeting notes, scripts, plans: anything long</div>
    <button class="btn block" data-a="newnote">+ New note</button>
    <h2>All notes \xB7 ${list.length}</h2>
    ${listOf(list.map((n) => `<div class="item"><div class="bubble plain">\u{1F4C4}</div><div class="grow" data-a="opennote" data-id="${n.id}">
      <div class="title">${n.pinned ? "\u{1F4CC} " : ""}${esc(n.title || "Untitled")}</div><div class="meta">${esc((n.body || "").slice(0, 90))}${(n.body || "").length > 90 ? "\u2026" : ""}</div>
      <div class="meta">${fmtWhen(n.updated)}</div></div></div>`), "No notes yet.")}`;
  }
  function renderShopping() {
    const pick = view.shopCat;
    const chips = SHOP_CATS.map(([c, e]) => `<button class="ftab ${c === pick ? "on" : ""}" data-a="shopcat" data-v="${c}"><span>${e}</span><b>${c}</b><small>${S.shopping.filter((s) => s.cat === c && !s.done).length}</small></button>`).join("");
    const row = (s) => `<div class="item ${s.done ? "done" : ""}"><button class="check ${s.done ? "on" : ""}" data-a="shop" data-id="${s.id}">${s.done ? "\u2713" : ""}</button><div class="grow title">${esc(s.text)}</div><button class="sub x" data-a="delshop" data-id="${s.id}">\u2715</button></div>`;
    const groups = SHOP_CATS.map(([c, e]) => {
      const items = S.shopping.filter((s) => s.cat === c && !s.done);
      return items.length ? `<h2>${e} ${c} \xB7 ${items.length}</h2>${listOf(items.map(row))}` : "";
    }).join("");
    const got = S.shopping.filter((s) => s.done);
    return `<h1>\u{1F6D2} Shopping list</h1><div class="sub">Pick a list, then add items</div>
    <div class="fgrid">${chips}</div>
    <div class="quick"><input id="shop-new" placeholder="Add to ${pick}\u2026 (comma for many: milk, eggs)"><button class="btn" data-a="addshop">Add</button></div>
    ${groups || '<div class="empty">All bought \u2728</div>'}
    ${got.length ? `<h2>\u2705 Bought \xB7 ${got.length}</h2>${listOf(got.slice(-20).reverse().map(row))}<button class="btn small ghost" data-a="clearshop">Clear bought items</button>` : ""}`;
  }
  function renderLearning() {
    const pick = view.learnCat;
    const icon = Object.fromEntries(LEARN_CATS);
    const chips = LEARN_CATS.map(([c, e]) => `<button class="ftab ${c === pick ? "on" : ""}" data-a="learncat" data-v="${c}"><span>${e}</span><b>${c}</b><small>${S.learning.filter((s) => s.cat === c && !s.done).length}</small></button>`).join("");
    const row = (s) => `<div class="item ${s.done ? "done" : ""}"><button class="check ${s.done ? "on" : ""}" data-a="learn" data-id="${s.id}">${s.done ? "\u2713" : ""}</button><div class="bubble plain">${icon[s.cat] || "\u{1F9E0}"}</div><div class="grow title">${esc(s.text)}</div><button class="sub x" data-a="dellearn" data-id="${s.id}">\u2715</button></div>`;
    const left = S.learning.filter((s) => !s.done && s.cat === pick);
    const all = S.learning.filter((s) => !s.done).length;
    const done = S.learning.filter((s) => s.done).slice(-10).reverse();
    return `<h1>\u{1F4DA} Learning</h1><div class="sub">${all} in your queue</div>
    <div class="fgrid">${chips}</div>
    <div class="quick"><input id="learn-new" placeholder="Add to ${pick}\u2026 e.g. Roger Deakins lighting masterclass"><button class="btn" data-a="addlearn">Add</button></div>
    <h2>${icon[pick]} ${pick} \xB7 ${left.length}</h2>${listOf(left.map(row), "Nothing in " + pick + " yet.")}
    ${done.length ? `<h2>\u{1F393} Finished</h2>${listOf(done.map(row))}` : ""}`;
  }
  function renderJournal() {
    const k = today();
    const e = S.journal[k] || {};
    const answered = JOURNAL_QS.filter((q) => e[q.id]).length;
    const past = Object.keys(S.journal).filter((d) => d !== k).sort().reverse().slice(0, 20);
    return `<h1>\u{1F319} Journal</h1><div class="sub">${answered}/${JOURNAL_QS.length} answered today \xB7 saves automatically</div>
    <div class="bar big" style="margin-top:10px"><i style="width:${Math.round(100 * answered / JOURNAL_QS.length)}%"></i></div>
    ${JOURNAL_QS.map((q) => q.type === "rating" ? `
      <div class="jq"><label>${q.emoji} ${q.q}</label><div class="rating">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button class="${Number(e.rating) === n ? "on" : ""}" data-a="rate" data-v="${n}">${n}</button>`).join("")}</div></div>` : `
      <div class="jq"><label>${q.emoji} ${q.q}</label><textarea data-j="${q.id}" rows="2">${esc(e[q.id] || "")}</textarea></div>`).join("")}
    ${past.length ? `<h2>Past entries</h2>${past.map((d) => {
      const x = S.journal[d], dt = /* @__PURE__ */ new Date(d + "T12:00:00");
      const lines = JOURNAL_QS.filter((q) => x[q.id] && q.type !== "rating").slice(0, 4).map((q) => `<div class="sub" style="margin-top:4px">${q.emoji} ${esc(x[q.id])}</div>`).join("");
      return `<div class="card"><b>${fmtDate(dt.getTime())}</b>${x.rating ? ` \xB7 \u2B50 ${x.rating}/10` : ""}${lines}</div>`;
    }).join("")}` : ""}`;
  }
  function renderReview() {
    const now = Date.now(), from = addDays(startOfDay(now), -6);
    const log = S.log.filter((e) => e.t >= from);
    const tab = view.reviewTab;
    const tabs = [["personal", "\u{1F64B} Personal"], ["company", "\u{1F3E2} Company"], ["shopping", "\u{1F6D2} Shopping"], ["ideas", "\u{1F4A1} Ideas"]];
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(addDays(startOfDay(now), -i));
    const barChart = (vals, max, labelFn) => `<div class="chart">${days.map((d, i) => `<div class="col"><div class="b" style="height:${Math.round(78 * vals[i] / Math.max(1, max)) + 4}px"></div><div class="dl">${DAYNAME[new Date(d).getDay()]}</div><div class="dv">${labelFn(vals[i])}</div></div>`).join("")}</div>`;
    const inDay = (e, d) => e.t >= d && e.t < addDays(d, 1);
    let body = "";
    if (tab === "personal") {
      const done = log.filter((e) => e.kind === "done" && PERSONAL_CATS.includes(e.cat));
      const act = S.routine.filter((x) => x.on).length || 1;
      const rPct = days.map((d) => Math.min(100, Math.round(100 * (S.routineLog[dayKey(d)] || []).length / act)));
      const ratings = days.map((d) => Number((S.journal[dayKey(d)] || {}).rating) || 0).filter(Boolean);
      const jDays = days.filter((d) => S.journal[dayKey(d)]).length;
      const learned = S.learning.filter((s) => s.done && s.doneAt >= from).length;
      const missed = log.filter((e) => e.kind === "missed" && PERSONAL_CATS.includes(e.cat));
      body = `<div class="stats">
        <div class="stat g-violet"><div class="l">Personal done</div><div class="n">${done.length}</div></div>
        <div class="stat g-teal"><div class="l">Routine avg</div><div class="n">${Math.round(rPct.reduce((a, b) => a + b, 0) / 7)}%</div></div>
        <div class="stat g-pink"><div class="l">Mood avg</div><div class="n">${ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "\u2013"}<small>/10</small></div></div>
        <div class="stat g-orange"><div class="l">Streak</div><div class="n">\u{1F525} ${streak()}</div></div></div>
      <div class="card"><h3>\u{1F33F} Routine completion</h3>${barChart(rPct, 100, (v) => v + "%")}</div>
      <div class="card"><h3>Habits of the mind</h3><div class="sub">\u{1F319} Journal written ${jDays}/7 days \xB7 \u{1F393} ${learned} learning item${learned === 1 ? "" : "s"} finished</div></div>
      ${missed.length ? `<div class="card"><h3>Slipped this week</h3><div class="sub">${[...new Set(missed.map((e) => e.task))].map(esc).join(" \xB7 ")}</div></div>` : ""}`;
    } else if (tab === "company") {
      const done = log.filter((e) => e.kind === "done" && COMPANY_CATS.includes(e.cat));
      const paidIn = log.filter((e) => e.kind === "paid" && e.dir === "in").reduce((a, e) => a + Number(e.amount || 0), 0);
      const paidOut = log.filter((e) => e.kind === "paid" && e.dir === "out").reduce((a, e) => a + Number(e.amount || 0), 0);
      const toCollect = S.payments.filter((p) => p.status === "pending" && p.type === "in").reduce((a, p) => a + Number(p.amount), 0);
      const perDay = days.map((d) => done.filter((e) => inDay(e, d)).length);
      const byClient = {};
      log.forEach((e) => {
        if (e.clientId) byClient[e.clientId] = (byClient[e.clientId] || 0) + 1;
      });
      const topClients = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const overdue = S.reminders.filter((r) => r.status === "pending" && !r.repeat && r.due < now && COMPANY_CATS.includes(r.cat));
      body = `<div class="stats">
        <div class="stat g-blue"><div class="l">Work done</div><div class="n">${done.length}</div></div>
        <div class="stat g-green"><div class="l">Received</div><div class="n">${money(paidIn)}</div></div>
        <div class="stat g-orange"><div class="l">Paid out</div><div class="n">${money(paidOut)}</div></div>
        <div class="stat g-violet"><div class="l">Still to collect</div><div class="n">${money(toCollect)}</div></div></div>
      <div class="card"><h3>\u{1F4BC} Work done per day</h3>${barChart(perDay, Math.max(...perDay), (v) => v)}</div>
      ${topClients.length ? `<div class="card"><h3>\u{1F91D} Most active clients</h3>${topClients.map(([id, n]) => `<div class="row" style="margin-top:8px"><span class="grow">${esc(clientName(clientById(id)) || "Old client")}</span><b>${n}</b></div>`).join("")}</div>` : ""}
      ${overdue.length ? `<h2 class="late">Overdue work: reschedule or drop</h2>${listOf(overdue.map((r) => remRow(r)))}` : ""}`;
    } else if (tab === "shopping") {
      const bought = S.shopping.filter((s) => s.done && (s.doneAt || 0) >= from);
      const pending = S.shopping.filter((s) => !s.done);
      body = `<div class="stats">
        <div class="stat g-pink"><div class="l">Bought</div><div class="n">${bought.length}</div></div>
        <div class="stat g-orange"><div class="l">Still to buy</div><div class="n">${pending.length}</div></div></div>
      <div class="card"><h3>By list</h3>${SHOP_CATS.map(([c, e]) => {
        const b = bought.filter((s) => s.cat === c).length, p = pending.filter((s) => s.cat === c).length;
        return b || p ? `<div class="row" style="margin-top:8px"><span class="grow">${e} ${c}</span><span class="sub">${b} bought \xB7 ${p} left</span></div>` : "";
      }).join("") || '<div class="sub">No shopping this week.</div>'}</div>`;
    } else {
      const ideas = S.ideas.filter((n) => n.created >= from);
      const brandIdeas = ideas.filter((n) => n.scope === "brand");
      const byBrand = {};
      brandIdeas.forEach((n) => {
        const k = n.clientId ? clientName(clientById(n.clientId)) : "Other";
        byBrand[k] = (byBrand[k] || 0) + 1;
      });
      const notes = S.notes.filter((n) => n.updated >= from && (n.title || n.body)).length;
      const learnAdded = S.learning.filter((s) => (s.created || 0) >= from).length;
      body = `<div class="stats">
        <div class="stat g-orange"><div class="l">New ideas</div><div class="n">${ideas.length}</div></div>
        <div class="stat g-blue"><div class="l">Notes written</div><div class="n">${notes}</div></div>
        <div class="stat g-violet"><div class="l">Company ideas</div><div class="n">${ideas.length - brandIdeas.length}</div></div>
        <div class="stat g-teal"><div class="l">Learning added</div><div class="n">${learnAdded}</div></div></div>
      ${Object.keys(byBrand).length ? `<div class="card"><h3>\u{1F4A1} Ideas per brand</h3>${Object.entries(byBrand).map(([k, n]) => `<div class="row" style="margin-top:8px"><span class="grow">${esc(k)}</span><b>${n}</b></div>`).join("")}</div>` : ""}
      ${ideas.length ? `<div class="card"><h3>This week's ideas</h3>${ideas.slice(-6).reverse().map((n) => `<div class="sub" style="margin-top:6px">\u{1F4A1} ${esc(n.text.slice(0, 100))}</div>`).join("")}</div>` : '<div class="empty">No new ideas this week. Inspiration comes when you capture it \u{1F4A1}</div>'}`;
    }
    return `<h1>\u{1F4CA} Weekly review</h1><div class="sub">${fmtDate(from)} \u2192 today</div>
    <div class="seg four">${tabs.map(([k, l]) => `<button class="${k === tab ? "on" : ""}" data-a="rtab" data-v="${k}">${l}</button>`).join("")}</div><div style="height:12px"></div>${body}`;
  }
  function renderSettings() {
    const st = S.settings;
    const sel = (key, opts) => `<select data-set="${key}">${opts.map((o) => `<option value="${o[0]}" ${String(st[key]) === String(o[0]) ? "selected" : ""}>${o[1]}</option>`).join("")}</select>`;
    const routineRows = S.routine.map((it, i) => `
    <div class="rrow ${it.on ? "" : "off"}">
      <span class="remo">${it.emoji}</span>
      <div class="grow"><b>${esc(it.label)}</b>
        <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">
          <button class="tgl ${it.ring ? "on" : ""}" data-a="rt-ring" data-i="${i}">\u{1F514} Ring till stopped</button>
          <button class="tgl ${it.speak ? "on" : ""}" data-a="rt-speak" data-i="${i}">\u{1F5E3} Speak</button>
        </div></div>
      <div class="rright"><input type="time" data-rt-time="${i}" value="${it.time}" class="tinput">
        <button class="switch ${it.on ? "on" : ""}" data-a="rt-on" data-i="${i}" aria-label="On or off"><i></i></button></div>
    </div>`).join("");
    return `<h1>\u2699\uFE0F Settings</h1>
    <label>Your name (Lucy greets you with it)</label><input data-set="name" value="${esc(st.name)}">

    <h2>\u{1F33F} Daily routine</h2>
    <div class="list">${routineRows}</div>
    <button class="btn small ghost" data-a="rt-reset">Reset routine to default</button>

    <h2>\u23F0 Reminders</h2>
    <div class="card">
      <div class="row"><div class="grow"><b>Ring until stopped</b><div class="sub">Reminders, meetings and payments keep ringing until you tap Done or Snooze</div></div>
        <button class="switch ${st.ringReminders ? "on" : ""}" data-a="toggle" data-v="ringReminders"><i></i></button></div>
      <div class="row" style="margin-top:14px"><div class="grow"><b>\u{1F5E3} Lucy speaks</b><div class="sub">Lucy reads reminders out loud when your phone is on ring</div></div>
        <button class="switch ${st.speak ? "on" : ""}" data-a="toggle" data-v="speak"><i></i></button></div>
    </div>
    <div class="grid2">
      <div><label>Remind again every</label>${sel("nagMin", [[5, "5 min"], [10, "10 min"], [15, "15 min"], [20, "20 min"], [30, "30 min"], [60, "1 hour"]])}</div>
      <div><label>Max repeats</label>${sel("maxNags", [[2, "2 times"], [4, "4 times"], [6, "6 times"], [8, "8 times"], [12, "12 times"]])}</div>
      <div><label>Snooze button</label>${sel("snoozeMin", [[5, "5 min"], [10, "10 min"], [15, "15 min"], [30, "30 min"], [60, "1 hour"]])}</div>
      <div><label>Morning briefing</label><input type="time" data-set="briefTime" value="${st.briefTime}"></div>
      <div><label>Top 5 check-ins</label>${sel("top5Checks", [["true", "2 PM &amp; 6 PM"], ["false", "Off"]])}</div>
      <div><label>Journal reminder</label><input type="time" data-set="journalTime" value="${st.journalTime}"></div>
      <div><label>Weekly review day</label>${sel("reviewDay", DAYNAME.map((d, i) => [i, d]))}</div>
      <div><label>Review time</label><input type="time" data-set="reviewTime" value="${st.reviewTime}"></div>
    </div>

    <h2>\u{1F9EA} Check Lucy is working</h2>
    <button class="btn block ghost" data-a="test-ring">\u{1F514} Test alarm in 10 seconds (rings until stopped)</button>
    <button class="btn block ghost" data-a="test-voice">\u{1F5E3} Test Lucy's voice</button>
    <button class="btn block ghost" data-a="test-party">\u{1F389} Test celebration</button>
    ${NATIVE ? `<div class="card" style="margin-top:10px"><div class="sub">Notifications: <b>${perm.notif}</b> \xB7 Exact alarms: <b>${perm.exact || "n/a"}</b> \xB7 Background: <b>${perm.battery ? "allowed" : "restricted"}</b></div>
      <div class="actions">${perm.notif !== "granted" ? '<button class="btn small" data-a="perm-notif">Turn on notifications</button>' : ""}${perm.exact && perm.exact !== "granted" ? '<button class="btn small" data-a="perm-exact">Allow exact alarms</button>' : ""}${!perm.battery ? '<button class="btn small" data-a="battery">Allow background</button>' : ""}</div></div>` : ""}
    <div class="card"><b>\u{1F50B} If alarms come late or not at all</b><div class="sub" style="margin-top:6px">Phone Settings \u2192 Apps \u2192 Lucy \u2192 Battery \u2192 <b>Unrestricted</b>. On Xiaomi, Redmi, Realme, Oppo or Vivo, also turn on <b>Autostart</b>. For the voice, keep your phone on ring and the alarm volume up.</div></div>
    <div class="sub" style="text-align:center;margin-top:18px">Lucy v2 \xB7 made for ${esc(name())} \u{1F4AB}</div>`;
  }
  function renderBackup() {
    return `<h1>\u{1F4BE} Backup</h1>
    <div class="sub">Your data lives only on this phone. Copy a backup now and then and paste it into WhatsApp "Message yourself" or Google Keep. If you change phones, paste it back here.</div>
    <h2>Make a backup</h2>
    <textarea id="bk-out" readonly style="min-height:110px;font-size:12px">${esc(JSON.stringify(S))}</textarea>
    <button class="btn block" data-a="copybk">\u{1F4CB} Copy backup</button>
    <h2>Restore a backup</h2>
    <textarea id="bk-in" placeholder="Paste your backup text here" style="font-size:12px"></textarea>
    <button class="btn block danger" data-a="restore">Restore (replaces current data)</button>`;
  }
  function openSheet(html, full) {
    $("#sheet").innerHTML = html;
    $("#sheet").classList.toggle("full", !!full);
    $("#sheet-wrap").hidden = false;
  }
  function closeSheet() {
    $("#sheet-wrap").hidden = true;
    $("#sheet").innerHTML = "";
    $("#sheet").classList.remove("full");
  }
  var pendingSave = null;
  function reminderSheet(r, preset) {
    const isNew = !r;
    const base = Object.assign({}, r || { task: "", cat: "Personal", due: atTime(Date.now(), (/* @__PURE__ */ new Date()).getHours() + 1, 0), repeat: "", clientId: null }, preset || {});
    const rep = base.repeat || "";
    const repKind = rep.startsWith("every:") ? "every" : rep;
    const every = rep.startsWith("every:") ? Number(rep.split(":")[1]) : 60;
    openSheet(`
    <h3>${isNew ? "New reminder" : "Edit reminder"}</h3>
    <label>What?</label><input id="f-task" value="${esc(base.task)}" placeholder="e.g. kal 11am call Mr. Ravi">
    <div class="hint">\u{1F4A1} Type naturally, like "monday 4pm meeting with Kliya", and Lucy fills in the date and time.</div>
    <div class="grid2">
      <div><label>Date</label><input id="f-date" type="date" value="${dayKey(base.due)}"></div>
      <div><label>Time</label><input id="f-time" type="time" value="${toTimeInput(base.due)}"></div>
    </div>
    <div class="grid2">
      <div><label>Repeat</label><select id="f-rep">
        ${[["", "Never"], ["daily", "Every day"], ["weekly", "Every week"], ["monthly", "Every month"], ["yearly", "Every year"], ["every", "Every few minutes/hours"]].map((o) => `<option value="${o[0]}" ${repKind === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}
      </select></div>
      <div><label>Category</label><select id="f-cat">${CATS.map((c) => `<option ${c === base.cat ? "selected" : ""}>${c}</option>`).join("")}</select></div>
    </div>
    <div id="f-every-wrap" ${repKind === "every" ? "" : "hidden"}><label>Every (minutes)</label><input id="f-every" type="number" min="5" step="5" value="${every}"></div>
    <label>Client (optional)</label><select id="f-client"><option value="">None</option>${S.clients.map((c) => `<option value="${c.id}" ${c.id === base.clientId ? "selected" : ""}>${esc(clientName(c))}</option>`).join("")}</select>
    <button class="btn block" data-a="saverem" data-id="${isNew ? "" : r.id}">${isNew ? "Add reminder" : "Save"}</button>
    ${!isNew && r.status === "pending" ? `<div class="actions">
      <button class="btn small ghost" data-a="done" data-id="${r.id}">\u2705 Done</button>
      <button class="btn small ghost" data-a="snz" data-id="${r.id}" data-v="10">\u{1F634} 10 min</button>
      <button class="btn small ghost" data-a="snz" data-id="${r.id}" data-v="60">\u{1F634} 1 hour</button>
      <button class="btn small ghost" data-a="tomorrow" data-id="${r.id}">\u27A1\uFE0F Tomorrow</button></div>` : ""}
    ${!isNew ? `<button class="btn block danger" data-a="delrem" data-id="${r.id}">Delete</button>` : ""}`);
  }
  function smartFillTask() {
    const el = $("#f-task");
    if (!el) return;
    const r = parseReminder(el.value);
    if (!r) return;
    el.value = r.task;
    $("#f-date").value = dayKey(r.due);
    $("#f-time").value = toTimeInput(r.due);
    $("#f-rep").value = r.repeat.startsWith("every:") ? "every" : r.repeat;
    if (r.repeat.startsWith("every:")) {
      $("#f-every").value = r.repeat.split(":")[1];
      $("#f-every-wrap").hidden = false;
    }
    $("#f-cat").value = r.cat;
    const client = S.clients.find((c) => clientName(c) && r.task.toLowerCase().includes(clientName(c).toLowerCase()));
    if (client) $("#f-client").value = String(client.id);
    toast("\u{1F4C5} " + fmtWhen(r.due));
  }
  function readReminderSheet() {
    if (parseReminder($("#f-task").value)) smartFillTask();
    const task = $("#f-task").value.trim();
    if (!task) {
      toast("What should I remind you about?");
      return null;
    }
    const due = fromInputs($("#f-date").value, $("#f-time").value);
    let repeat = $("#f-rep").value;
    if (repeat === "every") repeat = "every:" + Math.max(5, Number($("#f-every").value) || 60);
    return { task, due, start: due, repeat, cat: $("#f-cat").value, clientId: Number($("#f-client").value) || null };
  }
  function saveWithClashCheck(data, id, force) {
    if (!force) {
      const clashes = findClash(data.due, id);
      if (clashes.length) {
        pendingSave = { data, id };
        openSheet(`<div style="text-align:center"><div style="font-size:46px">\u26A0\uFE0F</div><h3>Time clash!</h3>
        <div class="sub">You already have this around ${fmtWhen(data.due)}:</div></div>
        <div class="list" style="margin-top:12px">${clashes.map((c) => `<div class="item cat" ${catStyle(c.r.cat)}><div class="bubble">${taskEmoji(c.r.task, c.r.cat)}</div><div class="grow"><div class="title">${esc(c.r.task)}</div><div class="meta">${fmtWhen(c.at)}${c.r.clientId ? " \xB7 \u{1F91D} " + esc(clientName(clientById(c.r.clientId))) : ""}</div></div></div>`).join("")}</div>
        <button class="btn block" data-a="clash-change">\u{1F552} Change time</button>
        <button class="btn block ghost" data-a="clash-save">Save anyway</button>`);
        buzz([60, 80, 60]);
        return;
      }
    }
    if (id) {
      const r = remById(id);
      Object.assign(r, data, { snoozeUntil: 0, status: "pending" });
      if (data.repeat && data.due <= Date.now()) r.due = nextAfter(r, Date.now());
      save();
      toast("Saved \u2713");
    } else {
      if (data.repeat && data.due <= Date.now()) data.due = nextAfter(Object.assign({}, data), Date.now());
      const r = addReminder(data);
      toast("Got it \u2705 " + fmtWhen(alertStart(r)));
      celebrate("small");
    }
    pendingSave = null;
    closeSheet();
    render();
  }
  function paymentSheet(p, preset) {
    const isNew = !p;
    const base = Object.assign({}, p || { type: view.moneyTab || "in", party: "", amount: "", due: startOfDay(Date.now()), note: "", clientId: null }, preset || {});
    if (preset && preset.clientId && !base.party) base.party = clientName(clientById(preset.clientId));
    openSheet(`
    <h3>${isNew ? "New payment" : "Edit payment"}</h3>
    <div class="seg" id="p-type"><button class="${base.type === "in" ? "on" : ""}" data-a="ptype" data-v="in">\u2B07\uFE0F I'll receive</button><button class="${base.type === "out" ? "on" : ""}" data-a="ptype" data-v="out">\u2B06\uFE0F I'll pay</button></div>
    <label>Who?</label><input id="p-party" list="p-clients" value="${esc(base.party)}" placeholder="Client or person">
    <datalist id="p-clients">${S.clients.map((c) => `<option value="${esc(clientName(c))}">`).join("")}</datalist>
    <div class="grid2">
      <div><label>Amount (\u20B9)</label><input id="p-amount" type="number" inputmode="numeric" value="${esc(base.amount)}" placeholder="25000"></div>
      <div><label>Due date</label><input id="p-due" type="date" value="${dayKey(base.due)}"></div>
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
    const client = S.clients.find((c) => clientName(c).toLowerCase() === party.toLowerCase());
    const data = { type: $("#sheet").dataset.ptype || "in", party, amount, due: startOfDay(fromInputs($("#p-due").value, "00:00")), note: $("#p-note").value.trim(), clientId: client ? client.id : null };
    if (id) Object.assign(payById(id), data, { snoozeUntil: 0 });
    else S.payments.push(Object.assign({ id: nid(), status: "pending", created: Date.now() }, data));
    save();
    closeSheet();
    render();
    toast("Saved \u2713");
  }
  var CLIENT_FIELDS = [
    ["firstName", "First name", "text", "Rahul"],
    ["lastName", "Last name", "text", "Shah"],
    ["personalPhone", "Personal contact number", "tel", "98xxxxxxxx"],
    ["company", "Company name", "text", "Kliya Cafe"],
    ["businessType", "Business type", "text", "Rooftop cafe"],
    ["address", "Company address", "text", "Sindhubhavan Road, Ahmedabad"],
    ["companyPhone", "Company contact number", "tel", "079xxxxxxx"],
    ["work", "Work we do for them", "text", "Social media, reels, Meta ads"],
    ["pkg", "Package", "text", "Elevate \xB7 \u20B940,000/month"],
    ["email", "Company email", "email", "hello@company.com"],
    ["instagram", "Instagram", "text", "@kliyacafe or link"],
    ["facebook", "Facebook", "text", "Page name or link"],
    ["gmb", "Google Business link", "url", "https://g.page/\u2026"]
  ];
  function clientSheet(c) {
    const isNew = !c;
    const base = c || {};
    const field = ([k, l, t, ph]) => `<div><label>${l}</label><input id="c-${k}" type="${t}" value="${esc(base[k] || "")}" placeholder="${esc(ph)}"></div>`;
    const F = CLIENT_FIELDS;
    openSheet(`<h3>${isNew ? "New client" : "Edit client"}</h3>
    <h2 style="margin-top:8px">\u{1F464} Person</h2>
    <div class="grid2">${field(F[0])}${field(F[1])}</div>${field(F[2])}
    <h2>\u{1F3E2} Company</h2>
    ${F.slice(3, 9).map(field).join("")}
    <h2>\u{1F310} Online</h2>
    ${F.slice(9).map(field).join("")}
    <button class="btn block" data-a="saveclient" data-id="${isNew ? "" : c.id}">${isNew ? "Add client" : "Save"}</button>
    ${!isNew ? `<button class="btn block danger" data-a="delclient" data-id="${c.id}">Delete client</button>` : ""}`);
  }
  function ideaSheet(n) {
    openSheet(`<h3>Edit idea</h3><textarea id="n-text" style="min-height:180px">${esc(n.text)}</textarea>
    ${n.scope === "brand" ? `<label>Brand</label><select id="n-client"><option value="">Other</option>${S.clients.map((c) => `<option value="${c.id}" ${c.id === n.clientId ? "selected" : ""}>${esc(clientName(c))}</option>`).join("")}</select>` : ""}
    <button class="btn block" data-a="saveidea" data-id="${n.id}">Save</button>
    <div class="actions"><button class="btn small ghost" data-a="pinidea" data-id="${n.id}">${n.pinned ? "Unpin" : "\u{1F4CC} Pin"}</button>
    <button class="btn small ghost" data-a="idea2rem" data-id="${n.id}">\u23F0 Make it a reminder</button></div>
    <button class="btn block danger" data-a="delidea" data-id="${n.id}">Delete</button>`);
  }
  function noteSheet(n) {
    openSheet(`<div class="row"><button class="link" data-a="close">\u2039 Done</button><span class="grow"></span>
      <button class="btn small ghost" data-a="pinnote" data-id="${n.id}">${n.pinned ? "Unpin" : "\u{1F4CC} Pin"}</button>
      <button class="btn small danger" data-a="delnote" data-id="${n.id}">Delete</button></div>
    <input id="note-title" class="note-title" data-nid="${n.id}" value="${esc(n.title)}" placeholder="Title">
    <textarea id="note-body" class="note-body" data-nid="${n.id}" placeholder="Start writing\u2026 meeting notes, scripts, plans">${esc(n.body)}</textarea>
    <div class="sub" style="text-align:right">Saves automatically</div>`, true);
    setTimeout(() => {
      const b = $(n.title ? "#note-body" : "#note-title");
      if (b) b.focus();
    }, 60);
  }
  function onboardingSheet() {
    openSheet(`<div style="text-align:center"><img class="lucy-logo big" src="lucy-icon.png" alt="Lucy">
    <h3>Hi, I'm Lucy \u{1F44B}</h3><div class="sub">I'll remember everything, so you don't have to.</div></div>
    <label>What should I call you?</label><input id="ob-name" value="${esc(S.settings.name)}">
    <div class="card" style="margin-top:12px"><b>\u{1F33F} Your daily routine is ready</b><div class="sub" style="margin-top:4px">Wake up 7:30 AM \u2192 long walk 9:30 PM, ${S.routine.length} reminders. Change any time in More \u2192 Settings.</div></div>
    <button class="btn block" data-a="obdone">Let's go \u2728</button>`);
  }
  document.addEventListener("pointerdown", (ev) => setTapPoint(ev.clientX, ev.clientY), true);
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
        render();
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
        else if (view.sub === "notes") newNote();
        else if (view.sub === "ideas") {
          const t = $("#idea-new");
          if (t) t.focus();
        } else if (view.sub === "shopping") {
          const t = $("#shop-new");
          if (t) t.focus();
        } else if (view.sub === "learning") {
          const t = $("#learn-new");
          if (t) t.focus();
        } else reminderSheet();
        break;
      case "done":
        closeSheet();
        markDone(id);
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
      case "saverem": {
        const d = readReminderSheet();
        if (d) saveWithClashCheck(d, id ? Number(id) : null);
        break;
      }
      case "clash-save":
        if (pendingSave) saveWithClashCheck(pendingSave.data, pendingSave.id, true);
        break;
      case "clash-change":
        if (pendingSave) {
          const ps = pendingSave;
          reminderSheet(ps.id ? remById(ps.id) : null, ps.data);
        }
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
      case "routine":
        routineToggle(el.dataset.k);
        render();
        break;
      case "filter":
        view.filter = v;
        render();
        break;
      case "mtab":
        view.moneyTab = v;
        render();
        break;
      case "settle":
        closeSheet();
        settlePayment(id);
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
        const data = {};
        CLIENT_FIELDS.forEach(([k]) => {
          data[k] = ($("#c-" + k).value || "").trim();
        });
        if (!data.company && !data.firstName) {
          toast("Add a company name or first name");
          break;
        }
        if (id) Object.assign(clientById(id), data);
        else {
          const c = Object.assign({ id: nid(), notes: "", created: Date.now() }, data);
          S.clients.push(c);
          view.clientId = c.id;
          celebrate("small");
        }
        save();
        closeSheet();
        render();
        toast("Saved \u2713");
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
      case "itab":
        view.ideaTab = v;
        render();
        break;
      case "addidea": {
        const t = $("#idea-new").value.trim();
        if (!t) break;
        const sel = $("#idea-client");
        S.ideas.push({ id: nid(), text: t, scope: view.ideaTab, clientId: sel ? Number(sel.value) || null : null, created: Date.now(), pinned: false });
        save(true);
        render();
        celebrate("small");
        toast("\u{1F4A1} Idea saved");
        break;
      }
      case "editidea": {
        const n = S.ideas.find((x) => x.id === Number(id));
        if (n) ideaSheet(n);
        break;
      }
      case "saveidea": {
        const n = S.ideas.find((x) => x.id === Number(id));
        n.text = $("#n-text").value;
        const sc = $("#n-client");
        if (sc) n.clientId = Number(sc.value) || null;
        save(true);
        closeSheet();
        render();
        break;
      }
      case "pinidea": {
        const n = S.ideas.find((x) => x.id === Number(id));
        n.pinned = !n.pinned;
        save(true);
        closeSheet();
        render();
        break;
      }
      case "delidea":
        if (confirm("Delete this idea?")) {
          S.ideas = S.ideas.filter((x) => x.id !== Number(id));
          save(true);
          closeSheet();
          render();
        }
        break;
      case "idea2rem": {
        const n = S.ideas.find((x) => x.id === Number(id));
        closeSheet();
        reminderSheet(null, { task: n.text.split("\n")[0].slice(0, 80), cat: "Work", clientId: n.clientId });
        break;
      }
      case "newnote":
        newNote();
        break;
      case "opennote": {
        const n = S.notes.find((x) => x.id === Number(id));
        if (n) noteSheet(n);
        break;
      }
      case "pinnote": {
        const n = S.notes.find((x) => x.id === Number(id));
        n.pinned = !n.pinned;
        save(true);
        el.textContent = n.pinned ? "Unpin" : "\u{1F4CC} Pin";
        toast(n.pinned ? "\u{1F4CC} Pinned" : "Unpinned");
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
      case "shopcat":
        view.shopCat = v;
        render();
        break;
      case "addshop": {
        const inp = $("#shop-new");
        inp.value.split(",").map((s) => s.trim()).filter(Boolean).forEach((t) => S.shopping.push({ id: nid(), text: t, cat: view.shopCat, done: false, created: Date.now() }));
        save(true);
        render();
        setTimeout(() => $("#shop-new") && $("#shop-new").focus(), 30);
        break;
      }
      case "shop": {
        const s = S.shopping.find((x) => x.id === Number(id));
        s.done = !s.done;
        s.doneAt = s.done ? Date.now() : 0;
        save(true);
        if (s.done) {
          celebrate("small");
          buzz(20);
        }
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
      case "learncat":
        view.learnCat = v;
        render();
        break;
      case "addlearn": {
        const t = $("#learn-new").value.trim();
        if (!t) break;
        S.learning.push({ id: nid(), text: t, cat: view.learnCat, done: false, created: Date.now() });
        save(true);
        render();
        break;
      }
      case "learn": {
        const s = S.learning.find((x) => x.id === Number(id));
        s.done = !s.done;
        s.doneAt = s.done ? Date.now() : 0;
        if (s.done) {
          logEvent("learned", { task: s.text, cat: "Personal" });
          celebrate("rain", { emoji: ["\u{1F9E0}", "\u{1F393}", "\u2728"] });
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
      case "rate": {
        const k = today();
        S.journal[k] = Object.assign(S.journal[k] || {}, { rating: Number(v) });
        save(true);
        render();
        checkJournalComplete();
        break;
      }
      case "rtab":
        view.reviewTab = v;
        render();
        break;
      case "toggle":
        S.settings[v] = !S.settings[v];
        save();
        render();
        toast("Saved \u2713");
        break;
      case "rt-on": {
        const it = S.routine[Number(el.dataset.i)];
        it.on = !it.on;
        save();
        render();
        break;
      }
      case "rt-ring": {
        const it = S.routine[Number(el.dataset.i)];
        it.ring = !it.ring;
        save();
        render();
        toast(it.ring ? "\u{1F514} " + it.label + " rings until stopped" : it.label + " rings once");
        break;
      }
      case "rt-speak": {
        const it = S.routine[Number(el.dataset.i)];
        it.speak = !it.speak;
        save();
        render();
        break;
      }
      case "rt-reset":
        if (confirm("Reset your daily routine to the default timings?")) {
          S.routine = clone(DEFAULTS.routine);
          save();
          render();
        }
        break;
      case "test-ring":
        testAlarm();
        break;
      case "test-voice":
        if (NATIVE) Alarm.speak({ text: "Hi " + name() + ", I am Lucy. I will remind you about everything." });
        else toast("Voice works inside the installed app");
        break;
      case "test-party":
        celebrate("big", { icon: "\u{1F3C6}", title: "You did it!", sub: "This is how Lucy celebrates your wins." });
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
      case "battery":
        Alarm.requestBatteryExemption().then(() => setTimeout(() => refreshPerms().then(render), 1500));
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
    if (id === "client-quick") {
      ev.preventDefault();
      clientQuickAdd(Number(ev.target.dataset.cid));
    } else if (id === "shop-new") {
      ev.preventDefault();
      document.querySelector('[data-a="addshop"]').click();
    } else if (id === "learn-new") {
      ev.preventDefault();
      document.querySelector('[data-a="addlearn"]').click();
    } else if (id === "f-task") {
      ev.preventDefault();
      smartFillTask();
    }
  });
  document.addEventListener("focusout", (ev) => {
    if (ev.target.id === "f-task") smartFillTask();
  });
  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.id === "idea-q") {
      view.ideaQ = t.value;
      const pos = t.selectionStart;
      render();
      const n = $("#idea-q");
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
    } else if (t.id === "note-title" || t.id === "note-body") {
      const n = S.notes.find((x) => x.id === Number(t.dataset.nid));
      if (n) {
        if (t.id === "note-title") n.title = t.value;
        else n.body = t.value;
        n.updated = Date.now();
        save(true);
      }
    } else if (t.dataset.j) {
      const k = today();
      S.journal[k] = Object.assign(S.journal[k] || {}, { [t.dataset.j]: t.value });
      save(true);
    } else if (t.dataset.set === "name") {
      S.settings.name = t.value;
      save();
    }
  });
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.dataset.set && t.dataset.set !== "name") {
      const k = t.dataset.set;
      let val = t.value;
      if (["nagMin", "maxNags", "snoozeMin", "reviewDay"].includes(k)) val = Number(val);
      if (k === "top5Checks") val = val === "true";
      S.settings[k] = val;
      save();
      toast("Saved \u2713");
    } else if (t.dataset.set === "name") {
      toast("Hello, " + name() + " \u{1F44B}");
    } else if (t.dataset.rtTime !== void 0) {
      const it = S.routine[Number(t.dataset.rtTime)];
      if (it && t.value) {
        it.time = t.value;
        S.routine.sort((a, b) => a.time.localeCompare(b.time));
        save();
        render();
        toast(it.emoji + " " + it.label + " \u2192 " + fmtHM(it.time));
      }
    } else if (t.id === "f-rep") {
      $("#f-every-wrap").hidden = t.value !== "every";
    } else if (t.dataset.j) {
      checkJournalComplete();
    }
  });
  function newNote() {
    const n = { id: nid(), title: "", body: "", created: Date.now(), updated: Date.now(), pinned: false };
    S.notes.push(n);
    save(true);
    noteSheet(n);
  }
  function checkJournalComplete() {
    const k = today(), e = S.journal[k] || {};
    S.celebrated[k] = S.celebrated[k] || {};
    if (JOURNAL_QS.every((q) => e[q.id]) && !S.celebrated[k].journal) {
      S.celebrated[k].journal = true;
      save(true);
      celebrate("big", { icon: "\u{1F4D6}", title: "Journal complete!", sub: "Every question answered. That's real self-awareness." });
    }
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
    saveWithClashCheck(r, null);
  }
  async function testAlarm() {
    if (!NATIVE) {
      toast("Test works inside the installed app");
      return;
    }
    try {
      await Alarm.add({
        id: 999999,
        at: Date.now() + 1e4,
        title: "\u{1F514} Lucy test alarm",
        body: "Tap Done to stop the ringing.",
        insistent: true,
        actions: "REMIND",
        snoozeMin: S.settings.snoozeMin,
        group: "test",
        speech: S.settings.speak ? name() + ", this is your test alarm. Tap done to stop me." : "",
        extra: { kind: "test" }
      });
      toast("Lock your phone and wait 10 seconds \u{1F514}");
    } catch (e) {
      toast("Could not schedule: " + e.message);
    }
  }
  function copyText(text) {
    const done = () => toast("\u{1F4CB} Copied. Paste it somewhere safe");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback);
    else fallback();
    function fallback() {
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
      S = migrate(d);
      save();
      go("today");
      toast("\u2705 Restored");
    } catch (e) {
      toast("That doesn't look like a Lucy backup");
    }
  }
  function finishOnboarding() {
    S.settings.name = ($("#ob-name").value || "Divyesh").trim();
    S.onboarded = true;
    save();
    closeSheet();
    if (NATIVE) LocalNotifications.requestPermissions().then(refreshPerms).then(render);
    render();
    celebrate("big", { icon: "\u{1F44B}", title: "Welcome, " + name() + "!", sub: "I've got your back from now on." });
  }
  (async function start() {
    save(true);
    normalize();
    render();
    await initNative();
    render();
    if (!S.onboarded) onboardingSheet();
    scheduleSync();
  })();
  window.__lucy = { get S() {
    return S;
  }, buildSchedule, render, topFive };
})();
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
