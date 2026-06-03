import * as TA from './index.js';

console.log('🚀 Running benchmarks...\n');

// Test 1: Native vs Polyfill performance
const iterations = 1000000;
const nativeArr = new Uint8Array(1000);
const polyArr = new TA.Uint8Array(1000);

console.time('Native set/get');
for (let i = 0; i < iterations; i++) {
  nativeArr[i % 1000] = i % 256;
  const _ = nativeArr[i % 1000];
}
console.timeEnd('Native set/get');

console.time('Polyfill set/get');
for (let i = 0; i < iterations; i++) {
  polyArr[i % 1000] = i % 256;
  const _ = polyArr[i % 1000];
}
console.timeEnd('Polyfill set/get');

// Test 2: Compression
const testData = new Uint8Array(10000);
for (let i = 0; i < testData.length; i++) testData[i] = Math.floor(Math.random() * 256);

console.time('Compression');
const compressed = TA.FastCompression.compress(testData);
console.timeEnd('Compression');
console.log(`Compression ratio: ${((compressed.length / testData.length) * 100).toFixed(1)}%`);

// Test 3: Pool performance
const pool = new TA.TypedArrayPool(50);
console.time('With pooling');
for (let i = 0; i < 10000; i++) {
  const arr = pool.acquire(1024);
  pool.release(arr);
}
console.timeEnd('With pooling');

console.time('Without pooling');
for (let i = 0; i < 10000; i++) {
  const arr = new Uint8Array(1024);
}
console.timeEnd('Without pooling');

console.log('\n✅ Benchmarks complete!');
