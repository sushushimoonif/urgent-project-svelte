import { writable } from 'svelte/store';

function createPersistentStore(key, initial) {
  const saved = localStorage.getItem(key);
  const store = writable(saved ? JSON.parse(saved) : initial);

  store.subscribe(value => {
    localStorage.setItem(key, JSON.stringify(value));
  });

  return store;
}

export const dataOutStore = createPersistentStore('dataOut', []);
