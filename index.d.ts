export const ArrayBuffer: ArrayBufferConstructor;
export const DataView: DataViewConstructor;
export const Int8Array: Int8ArrayConstructor;
export const Uint8Array: Uint8ArrayConstructor;
export const Uint8ClampedArray: Uint8ClampedArrayConstructor;
export const Int16Array: Int16ArrayConstructor;
export const Uint16Array: Uint16ArrayConstructor;
export const Int32Array: Int32ArrayConstructor;
export const Uint32Array: Uint32ArrayConstructor;
export const Float32Array: Float32ArrayConstructor;
export const Float64Array: Float64ArrayConstructor;
export const BigInt64Array: BigInt64ArrayConstructor;
export const BigUint64Array: BigUint64ArrayConstructor;
export const SharedArrayBuffer?: SharedArrayBufferConstructor;

export class WASMMemoryView {
  constructor(memory: WebAssembly.Memory);
  asUint8Array(offset?: number, length?: number): Uint8Array;
  asTypedArray(type: 'i8'|'u8'|'i16'|'u16'|'i32'|'u32'|'f32'|'f64', offset?: number, length?: number): TypedArray;
}

export class TypedArrayStream {
  constructor(chunkSize?: number);
  write(data: TypedArray | ArrayBuffer | number[]): this;
  consolidate<T extends TypedArrayConstructor>(TypedArrayType?: T): InstanceType<T>;
  [Symbol.asyncIterator](): AsyncIterator<TypedArray>;
}

export class SIMDVector {
  data: TypedArray;
  type: string;
  constructor(data: TypedArray, type?: string);
  static isSIMDSupported(): boolean;
  add(other: SIMDVector | TypedArray | number[]): SIMDVector;
  multiply(other: SIMDVector | TypedArray | number[] | number): SIMDVector;
  dot(other: SIMDVector | TypedArray | number[]): number;
}

export class TypedArrayPool {
  constructor(maxSize?: number, maxAge?: number);
  acquire(size: number, Type?: TypedArrayConstructor): TypedArray;
  release(array: TypedArray): void;
  clear(): void;
  readonly stats: { poolCount: number; totalBuffers: number; };
}

export const Endianess: {
  LITTLE_ENDIAN: boolean;
  BIG_ENDIAN: boolean;
  swap16(value: number): number;
  swap32(value: number): number;
  convertBuffer(buffer: ArrayBuffer, fromEndian: boolean, toEndian?: boolean): ArrayBuffer;
};

export const SecureRandom: {
  fill(array: TypedArray): TypedArray;
  generate<T extends TypedArrayConstructor>(Type: T, length: number): InstanceType<T>;
};

export function observable<T extends TypedArray>(array: T, callback: (index: string | symbol, oldValue: number | bigint, newValue: number | bigint, array: T) => void): T;

export const FastCompression: {
  compress(input: Uint8Array | number[]): Uint8Array;
  decompress(compressed: Uint8Array): Uint8Array;
};

export function concat<T extends TypedArrayConstructor>(arrays: TypedArray[], TypedArrayType?: T): InstanceType<T>;

export function isSupported(type: string): 'native' | 'polyfilled';

type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;
type TypedArrayConstructor = new (...args: any[]) => TypedArray;
