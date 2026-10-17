/** Generic object pool — avoid per-frame GC in the render/inference loops. */
export function createPool(factory, seed = 32) {
  const free = [];
  for (let i = 0; i < seed; i++) free.push(factory());
  return {
    alloc() {
      return free.pop() || factory();
    },
    release(obj) {
      free.push(obj);
    },
    releaseAll(arr) {
      for (let i = 0; i < arr.length; i++) free.push(arr[i]);
      arr.length = 0;
    },
  };
}

export function vec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}
