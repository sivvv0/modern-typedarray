import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as TA from './index.js';

describe('Modern TypedArray Package', () => {
  describe('Core TypedArrays', () => {
    it('creates Uint8Array from length', () => {
      const arr = new TA.Uint8Array(5);
      assert.equal(arr.length, 5);
      assert.equal(arr[0], 0);
    });
    
    it('creates from array', () => {
      const arr = new TA.Uint8Array([1, 2, 3]);
      assert.deepEqual([...arr], [1, 2, 3]);
    });
    
    it('handles BigInt64Array', () => {
      const arr = new TA.BigInt64Array([1n, 2n, 3n]);
      assert.equal(arr[0], 1n);
      assert.equal(arr[1], 2n);
    });
    
    it('supports toReversed()', () => {
      const arr = new TA.Uint8Array([1, 2, 3]);
      const reversed = arr.toReversed();
      assert.deepEqual([...reversed], [3, 2, 1]);
      assert.deepEqual([...arr], [1, 2, 3]);
    });
  });
  
  describe('TypedArrayPool', () => {
    it('reuses buffers', () => {
      const pool = new TA.TypedArrayPool(10);
      const arr1 = pool.acquire(100);
      pool.release(arr1);
      const arr2 = pool.acquire(100);
      assert.equal(arr1, arr2);
    });
  });
  
  describe('FastCompression', () => {
    it('compresses and decompresses', () => {
      const original = new Uint8Array([1, 1, 1, 2, 2, 3, 4, 4, 4, 4]);
      const compressed = TA.FastCompression.compress(original);
      const decompressed = TA.FastCompression.decompress(compressed);
      assert.deepEqual([...decompressed], [...original]);
      assert.ok(compressed.length < original.length);
    });
  });
  
  describe('SIMDVector', () => {
    it('performs vector addition', () => {
      const v1 = new TA.SIMDVector(new Float32Array([1, 2, 3]));
      const v2 = new TA.SIMDVector(new Float32Array([4, 5, 6]));
      const result = v1.add(v2);
      assert.deepEqual([...result.data], [5, 7, 9]);
    });
  });
  
  describe('isSupported', () => {
    it('detects support status', () => {
      const status = TA.isSupported('Uint8Array');
      assert(['native', 'polyfilled'].includes(status));
    });
  });
  
  console.log('✅ All tests passed!');
});
