interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}

function createDeferred(): Deferred {
  let resolve: () => void;
  let reject: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
}

export class Run {
  private deferred?: Deferred;

  start() {
    this.deferred = createDeferred();
  }

  finish() {
    this.deferred?.resolve();
    this.deferred = undefined;
  }

  wait() {
    if (!this.deferred) {
      return Promise.resolve();
    }

    return this.deferred.promise;
  }
}