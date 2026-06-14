// lib/store.ts

declare global {
  var requests: any[];
}

global.requests ??= [];

export const requests = global.requests;