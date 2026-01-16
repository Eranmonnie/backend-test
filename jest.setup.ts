import redis from './test/mocks/redis';

afterEach(() => {
  if (typeof redis.__reset === 'function') {
    redis.__reset();
  }
});
