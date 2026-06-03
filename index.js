/**
 * Modern TypedArray
 * @module modern-typedarray
 */

// ============ FEATURE DETECTION ============
const hasNative = (ctor) => typeof globalThis[ctor] === 'function';

// ============ CORE TYPEDARRAY POLYFILLS ============
function createTypedArrayType(name, bytesPerElement, fromBigInt = false) {
  return class TypedArrayPolyfill {
    constructor(arg, byteOffset, length) {
      this._bytesPerElement = bytesPerElement;
      
      if (typeof arg === 'number') {
        this._buffer = new ArrayBuffer(arg * bytesPerElement);
        this._byteOffset = 0;
        this._length = arg;
      } 
      else if (arg instanceof ArrayBuffer) {
        this._buffer = arg;
        this._byteOffset = byteOffset || 0;
        this._length = length !== undefined ? length : (arg.byteLength - this._byteOffset) / bytesPerElement;
      }
      else if (Array.isArray(arg) || (arg && arg.length !== undefined)) {
        this._length = arg.length;
        this._buffer = new ArrayBuffer(this._length * bytesPerElement);
        this._byteOffset = 0;
        
        for (let i = 0; i < this._length; i++) {
          let value = arg[i];
          if (fromBigInt && typeof value !== 'bigint') value = BigInt(value);
          else if (!fromBigInt && typeof value === 'bigint') value = Number(value);
          this[i] = value;
        }
      }
      else {
        throw new TypeError(`Invalid constructor argument for ${name}`);
      }
      
      return new Proxy(this, {
        get(target, prop) {
          if (prop === 'length') return target._length;
          if (prop === 'buffer') return target._buffer;
          if (prop === 'byteOffset') return target._byteOffset;
          if (prop === 'byteLength') return target._length * bytesPerElement;
          if (prop === Symbol.toStringTag) return name;
          
          const index = Number(prop);
          if (!isNaN(index) && index >= 0 && index < target._length) {
            const view = new DataView(target._buffer);
            const offset = target._byteOffset + (index * bytesPerElement);
            return target._getValue(view, offset);
          }
          
          const method = target[prop];
          if (typeof method === 'function') return method.bind(target);
          return method;
        },
        
        set(target, prop, value) {
          const index = Number(prop);
          if (!isNaN(index) && index >= 0 && index < target._length) {
            if (fromBigInt && typeof value !== 'bigint') value = BigInt(value);
            else if (!fromBigInt && typeof value === 'bigint') value = Number(value);
            
            const view = new DataView(target._buffer);
            const offset = target._byteOffset + (index * bytesPerElement);
            target._setValue(view, offset, value);
            return true;
          }
          return false;
        }
      });
    }
    
    _getValue(view, offset) { throw new Error('Implement in subclass'); }
    _setValue(view, offset, value) { throw new Error('Implement in subclass'); }
    
    static get BYTES_PER_ELEMENT() { return bytesPerElement; }
    
    set(array, offset = 0) {
      if (offset < 0 || offset >= this._length) throw new RangeError('Offset out of bounds');
      const len = Math.min(array.length, this._length - offset);
      for (let i = 0; i < len; i++) this[offset + i] = array[i];
    }
    
    subarray(begin = 0, end = this._length) {
      const start = Math.max(0, begin < 0 ? this._length + begin : begin);
      const finish = Math.min(this._length, end < 0 ? this._length + end : end);
      const length = Math.max(0, finish - start);
      const Constructor = this.constructor;
      return new Constructor(this._buffer, this._byteOffset + (start * this._bytesPerElement), length);
    }
    
    slice(start = 0, end = this._length) {
      const sub = this.subarray(start, end);
      const Constructor = this.constructor;
      const result = new Constructor(sub.length);
      result.set(sub);
      return result;
    }
    
    [Symbol.iterator]() {
      let index = 0;
      const length = this._length;
      const self = this;
      return {
        next() {
          if (index < length) return { value: self[index], done: false };
          return { value: undefined, done: true };
        }
      };
    }
    
    findLast(predicate, thisArg) {
      for (let i = this._length - 1; i >= 0; i--) {
        if (predicate.call(thisArg, this[i], i, this)) return this[i];
      }
      return undefined;
    }
    
    findLastIndex(predicate, thisArg) {
      for (let i = this._length - 1; i >= 0; i--) {
        if (predicate.call(thisArg, this[i], i, this)) return i;
      }
      return -1;
    }
    
    toReversed() {
      const result = new this.constructor(this._length);
      for (let i = 0; i < this._length; i++) result[i] = this[this._length - 1 - i];
      return result;
    }
    
    toSorted(compareFn) {
      const array = Array.from(this);
      array.sort(compareFn);
      const result = new this.constructor(array.length);
      result.set(array);
      return result;
    }
    
    toSpliced(start, deleteCount, ...items) {
      const array = Array.from(this);
      const spliced = array.toSpliced(start, deleteCount, ...items);
      const result = new this.constructor(spliced.length);
      result.set(spliced);
      return result;
    }
    
    with(index, value) {
      if (index < 0 || index >= this._length) throw new RangeError('Index out of bounds');
      const result = new this.constructor(this._length);
      result.set(this);
      result[index] = value;
      return result;
    }
  };
}

// Concrete implementations
export const Int8ArrayPolyfill = class extends createTypedArrayType('Int8Array', 1, false) {
  _getValue(view, offset) { return view.getInt8(offset); }
  _setValue(view, offset, value) { view.setInt8(offset, value); }
};

export const Uint8ArrayPolyfill = class extends createTypedArrayType('Uint8Array', 1, false) {
  _getValue(view, offset) { return view.getUint8(offset); }
  _setValue(view, offset, value) { view.setUint8(offset, value); }
};

export const Uint8ClampedArrayPolyfill = class extends createTypedArrayType('Uint8ClampedArray', 1, false) {
  _setValue(view, offset, value) {
    const clamped = Math.max(0, Math.min(255, Math.round(value)));
    view.setUint8(offset, clamped);
  }
  _getValue(view, offset) { return view.getUint8(offset); }
};

export const Int16ArrayPolyfill = class extends createTypedArrayType('Int16Array', 2, false) {
  _getValue(view, offset) { return view.getInt16(offset, true); }
  _setValue(view, offset, value) { view.setInt16(offset, value, true); }
};

export const Uint16ArrayPolyfill = class extends createTypedArrayType('Uint16Array', 2, false) {
  _getValue(view, offset) { return view.getUint16(offset, true); }
  _setValue(view, offset, value) { view.setUint16(offset, value, true); }
};

export const Int32ArrayPolyfill = class extends createTypedArrayType('Int32Array', 4, false) {
  _getValue(view, offset) { return view.getInt32(offset, true); }
  _setValue(view, offset, value) { view.setInt32(offset, value, true); }
};

export const Uint32ArrayPolyfill = class extends createTypedArrayType('Uint32Array', 4, false) {
  _getValue(view, offset) { return view.getUint32(offset, true); }
  _setValue(view, offset, value) { view.setUint32(offset, value, true); }
};

export const Float32ArrayPolyfill = class extends createTypedArrayType('Float32Array', 4, false) {
  _getValue(view, offset) { return view.getFloat32(offset, true); }
  _setValue(view, offset, value) { view.setFloat32(offset, value, true); }
};

export const Float64ArrayPolyfill = class extends createTypedArrayType('Float64Array', 8, false) {
  _getValue(view, offset) { return view.getFloat64(offset, true); }
  _setValue(view, offset, value) { view.setFloat64(offset, value, true); }
};

export const BigInt64ArrayPolyfill = class extends createTypedArrayType('BigInt64Array', 8, true) {
  _getValue(view, offset) { return view.getBigInt64(offset, true); }
  _setValue(view, offset, value) { view.setBigInt64(offset, BigInt(value), true); }
};

export const BigUint64ArrayPolyfill = class extends createTypedArrayType('BigUint64Array', 8, true) {
  _getValue(view, offset) { return view.getBigUint64(offset, true); }
  _setValue(view, offset, value) { view.setBigUint64(offset, BigInt(value), true); }
};

// ============ ARRAYBUFFER & DATAVIEW ============
export class ArrayBufferPolyfill {
  constructor(byteLength, options = {}) {
    this._byteLength = byteLength;
    this._maxByteLength = options.maxByteLength || byteLength;
    this._data = new Uint8Array(byteLength);
    this._detached = false;
  }
  
  get byteLength() { return this._detached ? 0 : this._byteLength; }
  get maxByteLength() { return this._maxByteLength; }
  get resizable() { return this._maxByteLength > this._byteLength; }
  get detached() { return this._detached; }
  
  slice(begin, end) {
    if (this._detached) throw new TypeError('ArrayBuffer is detached');
    const start = begin ?? 0;
    const finish = end ?? this._byteLength;
    const newLength = Math.max(0, finish - start);
    const result = new ArrayBufferPolyfill(newLength);
    result._data.set(this._data.subarray(start, finish));
    return result;
  }
  
  transfer(newByteLength = this._byteLength) {
    if (this._detached) throw new TypeError('ArrayBuffer is already transferred');
    const newBuffer = new ArrayBufferPolyfill(newByteLength);
    const copyLength = Math.min(this._byteLength, newByteLength);
    newBuffer._data.set(this._data.subarray(0, copyLength));
    this._detached = true;
    this._data = null;
    return newBuffer;
  }
  
  transferToFixedLength(newByteLength) {
    return this.transfer(newByteLength);
  }
  
  resize(newByteLength) {
    if (this._detached) throw new TypeError('ArrayBuffer is detached');
    if (newByteLength > this._maxByteLength) throw new RangeError('Exceeds maximum size');
    if (newByteLength === this._byteLength) return;
    
    const newData = new Uint8Array(newByteLength);
    newData.set(this._data.subarray(0, Math.min(this._byteLength, newByteLength)));
    this._data = newData;
    this._byteLength = newByteLength;
  }
}

export class DataViewPolyfill {
  constructor(buffer, byteOffset = 0, byteLength = buffer.byteLength - byteOffset) {
    this._buffer = buffer;
    this._byteOffset = byteOffset;
    this._byteLength = byteLength;
  }
  
  get buffer() { return this._buffer; }
  get byteOffset() { return this._byteOffset; }
  get byteLength() { return this._byteLength; }
  
  getInt8(offset) { return new Uint8Array(this._buffer)[this._byteOffset + offset]; }
  setInt8(offset, value) { new Uint8Array(this._buffer)[this._byteOffset + offset] = value; }
  getUint8(offset) { return new Uint8Array(this._buffer)[this._byteOffset + offset]; }
  setUint8(offset, value) { new Uint8Array(this._buffer)[this._byteOffset + offset] = value; }
  getInt16(offset, littleEndian) { 
    const arr = new Uint8Array(this._buffer);
    const a = arr[this._byteOffset + offset];
    const b = arr[this._byteOffset + offset + 1];
    if (littleEndian) return a | (b << 8);
    return (a << 8) | b;
  }
  setInt16(offset, value, littleEndian) {
    const arr = new Uint8Array(this._buffer);
    if (littleEndian) {
      arr[this._byteOffset + offset] = value & 0xFF;
      arr[this._byteOffset + offset + 1] = (value >> 8) & 0xFF;
    } else {
      arr[this._byteOffset + offset] = (value >> 8) & 0xFF;
      arr[this._byteOffset + offset + 1] = value & 0xFF;
    }
  }
  getUint16(offset, littleEndian) { return this.getInt16(offset, littleEndian) >>> 0; }
  setUint16(offset, value, littleEndian) { this.setInt16(offset, value, littleEndian); }
  getInt32(offset, littleEndian) {
    const arr = new Uint8Array(this._buffer);
    const a = arr[this._byteOffset + offset];
    const b = arr[this._byteOffset + offset + 1];
    const c = arr[this._byteOffset + offset + 2];
    const d = arr[this._byteOffset + offset + 3];
    if (littleEndian) return a | (b << 8) | (c << 16) | (d << 24);
    return (a << 24) | (b << 16) | (c << 8) | d;
  }
  setInt32(offset, value, littleEndian) {
    const arr = new Uint8Array(this._buffer);
    if (littleEndian) {
      arr[this._byteOffset + offset] = value & 0xFF;
      arr[this._byteOffset + offset + 1] = (value >> 8) & 0xFF;
      arr[this._byteOffset + offset + 2] = (value >> 16) & 0xFF;
      arr[this._byteOffset + offset + 3] = (value >> 24) & 0xFF;
    } else {
      arr[this._byteOffset + offset] = (value >> 24) & 0xFF;
      arr[this._byteOffset + offset + 1] = (value >> 16) & 0xFF;
      arr[this._byteOffset + offset + 2] = (value >> 8) & 0xFF;
      arr[this._byteOffset + offset + 3] = value & 0xFF;
    }
  }
  getUint32(offset, littleEndian) { return this.getInt32(offset, littleEndian) >>> 0; }
  setUint32(offset, value, littleEndian) { this.setInt32(offset, value, littleEndian); }
  getFloat32(offset, littleEndian) {
    const intVal = this.getInt32(offset, littleEndian);
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setInt32(0, intVal, true);
    return new Float32Array(buffer)[0];
  }
  setFloat32(offset, value, littleEndian) {
    const buffer = new ArrayBuffer(4);
    new Float32Array(buffer)[0] = value;
    const intVal = new DataView(buffer).getInt32(0, true);
    this.setInt32(offset, intVal, littleEndian);
  }
  getFloat64(offset, littleEndian) {
    const arr = new Uint8Array(this._buffer);
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    for (let i = 0; i < 8; i++) {
      view.setUint8(i, arr[this._byteOffset + offset + (littleEndian ? i : 7 - i)], true);
    }
    return view.getFloat64(0, true);
  }
  setFloat64(offset, value, littleEndian) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setFloat64(0, value, true);
    const arr = new Uint8Array(this._buffer);
    for (let i = 0; i < 8; i++) {
      arr[this._byteOffset + offset + (littleEndian ? i : 7 - i)] = view.getUint8(i);
    }
  }
  getBigInt64(offset, littleEndian) {
    const high = this.getUint32(offset + (littleEndian ? 4 : 0), littleEndian);
    const low = this.getUint32(offset + (littleEndian ? 0 : 4), littleEndian);
    return (BigInt(high) << 32n) | BigInt(low);
  }
  setBigInt64(offset, value, littleEndian) {
    const high = Number((value >> 32n) & 0xFFFFFFFFn);
    const low = Number(value & 0xFFFFFFFFn);
    if (littleEndian) {
      this.setUint32(offset, low, true);
      this.setUint32(offset + 4, high, true);
    } else {
      this.setUint32(offset, high, false);
      this.setUint32(offset + 4, low, false);
    }
  }
  getBigUint64(offset, littleEndian) {
    const val = this.getBigInt64(offset, littleEndian);
    return val >= 0 ? val : val + 0x10000000000000000n;
  }
  setBigUint64(offset, value, littleEndian) {
    this.setBigInt64(offset, BigInt(value), littleEndian);
  }
}

// ============ SMART EXPORTS (Auto-detect native) ============
export const ArrayBuffer = hasNative('ArrayBuffer') ? globalThis.ArrayBuffer : ArrayBufferPolyfill;
export const DataView = hasNative('DataView') ? globalThis.DataView : DataViewPolyfill;
export const Int8Array = hasNative('Int8Array') ? globalThis.Int8Array : Int8ArrayPolyfill;
export const Uint8Array = hasNative('Uint8Array') ? globalThis.Uint8Array : Uint8ArrayPolyfill;
export const Uint8ClampedArray = hasNative('Uint8ClampedArray') ? globalThis.Uint8ClampedArray : Uint8ClampedArrayPolyfill;
export const Int16Array = hasNative('Int16Array') ? globalThis.Int16Array : Int16ArrayPolyfill;
export const Uint16Array = hasNative('Uint16Array') ? globalThis.Uint16Array : Uint16ArrayPolyfill;
export const Int32Array = hasNative('Int32Array') ? globalThis.Int32Array : Int32ArrayPolyfill;
export const Uint32Array = hasNative('Uint32Array') ? globalThis.Uint32Array : Uint32ArrayPolyfill;
export const Float32Array = hasNative('Float32Array') ? globalThis.Float32Array : Float32ArrayPolyfill;
export const Float64Array = hasNative('Float64Array') ? globalThis.Float64Array : Float64ArrayPolyfill;
export const BigInt64Array = hasNative('BigInt64Array') ? globalThis.BigInt64Array : BigInt64ArrayPolyfill;
export const BigUint64Array = hasNative('BigUint64Array') ? globalThis.BigUint64Array : BigUint64ArrayPolyfill;
export const SharedArrayBuffer = hasNative('SharedArrayBuffer') ? globalThis.SharedArrayBuffer : undefined;

// ============ ADVANCED FEATURES ============

export class WASMMemoryView {
  constructor(memory) { this._memory = memory; this._buffer = memory.buffer; }
  asUint8Array(offset = 0, length) { return new Uint8Array(this._memory.buffer, offset, length); }
  asTypedArray(type, offset = 0, length) {
    const types = { 'i8': Int8Array, 'u8': Uint8Array, 'i16': Int16Array, 'u16': Uint16Array, 'i32': Int32Array, 'u32': Uint32Array, 'f32': Float32Array, 'f64': Float64Array };
    const TA = types[type];
    return new TA(this._memory.buffer, offset, length);
  }
}

export class TypedArrayStream {
  constructor(chunkSize = 65536) {
    this.chunkSize = chunkSize;
    this._buffers = [];
    this._totalLength = 0;
  }
  write(data) {
    const source = data.buffer ? data : new Uint8Array(data);
    this._buffers.push(source);
    this._totalLength += source.length;
    return this;
  }
  async *[Symbol.asyncIterator]() { for (const buffer of this._buffers) yield buffer; }
  consolidate(TypedArrayType = Uint8Array) {
    const result = new TypedArrayType(this._totalLength);
    let offset = 0;
    for (const buffer of this._buffers) { result.set(buffer, offset); offset += buffer.length; }
    return result;
  }
}

// FIXED SIMDVector Class
export class SIMDVector {
  constructor(data, type = 'f32') { 
    this.data = data; 
    this.type = type; 
  }
  
  static isSIMDSupported() { 
    return typeof WebAssembly !== 'undefined' && WebAssembly.validate(new Uint8Array([0x00, 0x61, 0x73, 0x6d])); 
  }
  
  add(other) {
    // Handle different input types
    let otherData;
    if (other instanceof SIMDVector) {
      otherData = other.data;
    } else if (other.buffer instanceof ArrayBuffer) {
      otherData = other;
    } else if (Array.isArray(other)) {
      otherData = new this.data.constructor(other);
    } else {
      otherData = other;
    }
    
    const result = new this.data.constructor(this.data.length);
    for (let i = 0; i < this.data.length; i++) {
      const val1 = this.data[i];
      const val2 = otherData[i];
      // Handle BigInt vs Number
      if (typeof val1 === 'bigint' || typeof val2 === 'bigint') {
        result[i] = BigInt(val1) + BigInt(val2);
      } else {
        result[i] = val1 + val2;
      }
    }
    return new SIMDVector(result, this.type);
  }
  
  multiply(other) {
    // Handle different input types
    let otherData;
    let isScalar = typeof other === 'number' || typeof other === 'bigint';
    
    if (isScalar) {
      const scalar = other;
      const result = new this.data.constructor(this.data.length);
      for (let i = 0; i < this.data.length; i++) {
        if (typeof this.data[i] === 'bigint' || typeof scalar === 'bigint') {
          result[i] = BigInt(this.data[i]) * BigInt(scalar);
        } else {
          result[i] = this.data[i] * scalar;
        }
      }
      return new SIMDVector(result, this.type);
    }
    
    if (other instanceof SIMDVector) {
      otherData = other.data;
    } else if (other.buffer instanceof ArrayBuffer) {
      otherData = other;
    } else if (Array.isArray(other)) {
      otherData = new this.data.constructor(other);
    } else {
      otherData = other;
    }
    
    const result = new this.data.constructor(this.data.length);
    for (let i = 0; i < this.data.length; i++) {
      const val1 = this.data[i];
      const val2 = otherData[i];
      if (typeof val1 === 'bigint' || typeof val2 === 'bigint') {
        result[i] = BigInt(val1) * BigInt(val2);
      } else {
        result[i] = val1 * val2;
      }
    }
    return new SIMDVector(result, this.type);
  }
  
  dot(other) {
    let otherData;
    if (other instanceof SIMDVector) {
      otherData = other.data;
    } else if (other.buffer instanceof ArrayBuffer) {
      otherData = other;
    } else if (Array.isArray(other)) {
      otherData = new this.data.constructor(other);
    } else {
      otherData = other;
    }
    
    let sum = 0;
    let sumBigInt = 0n;
    let isBigInt = false;
    
    for (let i = 0; i < this.data.length; i++) {
      const val1 = this.data[i];
      const val2 = otherData[i];
      if (typeof val1 === 'bigint' || typeof val2 === 'bigint') {
        isBigInt = true;
        sumBigInt += BigInt(val1) * BigInt(val2);
      } else {
        sum += val1 * val2;
      }
    }
    
    return isBigInt ? sumBigInt : sum;
  }
}

export class TypedArrayPool {
  constructor(maxSize = 100, maxAge = 60000) {
    this._pool = new Map();
    this._maxSize = maxSize;
    this._maxAge = maxAge;
  }
  acquire(size, Type = Uint8Array) {
    const key = `${Type.name}_${size}`;
    const pool = this._pool.get(key) || [];
    if (pool.length > 0) {
      const entry = pool.pop();
      if (Date.now() - entry.timestamp < this._maxAge) return entry.array;
    }
    return new Type(size);
  }
  release(array) {
    const key = `${array.constructor.name}_${array.length}`;
    const pool = this._pool.get(key) || [];
    if (pool.length < this._maxSize) {
      pool.push({ array, timestamp: Date.now() });
      this._pool.set(key, pool);
    }
  }
  clear() { this._pool.clear(); }
  get stats() {
    let total = 0;
    for (const pool of this._pool.values()) total += pool.length;
    return { poolCount: this._pool.size, totalBuffers: total };
  }
}

export const Endianess = {
  LITTLE_ENDIAN: true, BIG_ENDIAN: false,
  swap16(value) { return ((value & 0xFF) << 8) | ((value >> 8) & 0xFF); },
  swap32(value) { return ((value & 0xFF) << 24) | ((value & 0xFF00) << 8) | ((value >> 8) & 0xFF00) | ((value >> 24) & 0xFF); },
  convertBuffer(buffer, fromEndian, toEndian = true) {
    if (fromEndian === toEndian) return buffer;
    const view = new DataView(buffer);
    const result = new ArrayBuffer(buffer.byteLength);
    const resultView = new DataView(result);
    for (let i = 0; i < buffer.byteLength; i += 2) resultView.setUint16(i, view.getUint16(i, fromEndian), toEndian);
    return result;
  }
};

// Fixed SecureRandom - no top-level await
let nodeCrypto = null;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    const crypto = await import('crypto');
    nodeCrypto = crypto;
  } catch (e) {
    // Crypto not available
  }
}

export const SecureRandom = {
  fill(array) {
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(array);
    } else if (nodeCrypto) {
      const bytes = nodeCrypto.randomBytes(array.byteLength);
      array.set(new Uint8Array(bytes));
    } else {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return array;
  },
  generate(Type, length) { const array = new Type(length); this.fill(array); return array; }
};

export function observable(array, callback) {
  return new Proxy(array, {
    set(target, prop, value) {
      const oldValue = target[prop];
      const result = Reflect.set(target, prop, value);
      if (oldValue !== value && typeof callback === 'function') callback(prop, oldValue, value, target);
      return result;
    }
  });
}

export const FastCompression = {
  compress(input) {
    const inputArray = input instanceof Uint8Array ? input : new Uint8Array(input);
    const output = new Uint8Array(inputArray.length * 1.1);
    let inputPos = 0, outputPos = 0;
    while (inputPos < inputArray.length) {
      const byte = inputArray[inputPos];
      let runLength = 1;
      while (inputPos + runLength < inputArray.length && inputArray[inputPos + runLength] === byte && runLength < 127) runLength++;
      if (runLength > 3 || byte === 0) {
        output[outputPos++] = 0x80 | runLength;
        output[outputPos++] = byte;
        inputPos += runLength;
      } else {
        for (let i = 0; i < runLength; i++) output[outputPos++] = byte;
        inputPos += runLength;
      }
    }
    return output.slice(0, outputPos);
  },
  decompress(compressed) {
    const output = [];
    let i = 0;
    while (i < compressed.length) {
      const header = compressed[i++];
      if (header & 0x80) {
        const length = header & 0x7F;
        const value = compressed[i++];
        for (let j = 0; j < length; j++) output.push(value);
      } else output.push(header);
    }
    return new Uint8Array(output);
  }
};

export const GPUInterop = {
  toWebGLTexture(gl, array, width, height, format = gl.RGBA) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, gl.UNSIGNED_BYTE, array);
    return texture;
  },
  fromWebGLFramebuffer(gl, width, height, format = gl.RGBA) {
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, format, gl.UNSIGNED_BYTE, pixels);
    return pixels;
  }
};

export function concat(arrays, TypedArrayType = Uint8Array) {
  let totalLength = 0;
  for (const arr of arrays) totalLength += arr.length;
  const result = new TypedArrayType(totalLength);
  let offset = 0;
  for (const arr of arrays) { result.set(arr, offset); offset += arr.length; }
  return result;
}

export function isSupported(type) {
  const types = {
    'ArrayBuffer': ArrayBuffer, 'DataView': DataView,
    'Int8Array': Int8Array, 'Uint8Array': Uint8Array, 'Uint8ClampedArray': Uint8ClampedArray,
    'Int16Array': Int16Array, 'Uint16Array': Uint16Array,
    'Int32Array': Int32Array, 'Uint32Array': Uint32Array,
    'Float32Array': Float32Array, 'Float64Array': Float64Array,
    'BigInt64Array': BigInt64Array, 'BigUint64Array': BigUint64Array
  };
  const ctor = types[type];
  return ctor && ctor !== globalThis[type] ? 'polyfilled' : 'native';
}

export function getMemoryStats() {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      usedJSHeapSize: performance.memory.usedJSHeapSize
    };
  }
  return null;
}
