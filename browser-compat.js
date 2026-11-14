// Application data only: do not replace browser globals or infer capabilities from screen size/UA.
(function () {
  'use strict';
  var nativeClone = typeof window.structuredClone === 'function' ? window.structuredClone.bind(window) : null;
  var features = {structuredClone:!!nativeClone, hasOwn:typeof Object.hasOwn === 'function', arrayAt:typeof Array.prototype.at === 'function', randomUUID:!!(window.crypto && window.crypto.randomUUID)};
  function cloneData(value) {
    if (nativeClone) return nativeClone(value);
    var seen = new Map();
    function copy(v) {
      if (typeof v === 'function' || typeof v === 'symbol') throw new DOMException('Unsupported application data', 'DataCloneError');
      if (v === null || typeof v !== 'object') return v;
      if (seen.has(v)) return seen.get(v);
      var out, tag = Object.prototype.toString.call(v);
      if (tag === '[object Date]') out = new Date(v.getTime());
      else if (tag === '[object RegExp]') out = new RegExp(v.source, v.flags);
      else if (tag === '[object File]' && typeof File === 'function') out = new File([v], v.name, {type:v.type, lastModified:v.lastModified});
      else if (tag === '[object Blob]') out = v.slice(0, v.size, v.type);
      else if (tag === '[object ArrayBuffer]') out = v.slice(0);
      else if (ArrayBuffer.isView(v)) {
        var buffer = copy(v.buffer);
        out = tag === '[object DataView]' ? new DataView(buffer, v.byteOffset, v.byteLength) : new v.constructor(buffer, v.byteOffset, v.length);
      } else if (tag === '[object Map]') {
        out = new Map(); seen.set(v, out); v.forEach(function (item, key) { out.set(copy(key), copy(item)); }); return out;
      } else if (tag === '[object Set]') {
        out = new Set(); seen.set(v, out); v.forEach(function (item) { out.add(copy(item)); }); return out;
      } else if (Array.isArray(v) || tag === '[object Object]') {
        out = Array.isArray(v) ? new Array(v.length) : {}; seen.set(v, out);
        Object.keys(v).forEach(function (key) { Object.defineProperty(out, key, {value:copy(v[key]), writable:true, enumerable:true, configurable:true}); });
        return out;
      } else throw new DOMException('Unsupported application data: ' + tag, 'DataCloneError');
      seen.set(v, out); return out;
    }
    return copy(value);
  }
  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    // Still use cryptographic randomness for feedback/sync identities on older browsers.
    var bytes = new Uint8Array(16); window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.from(bytes, function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
    return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
  }
  window.QBANK_COMPAT = {cloneData:cloneData, uuid:uuid, features:features};
})();
