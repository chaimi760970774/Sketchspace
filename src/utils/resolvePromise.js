// Mutation is intended here: promiseState is a MobX observable owned by the model,
// and changing its fields is how observers (presenters) learn about the promise progress.
export function resolvePromise(promise, promiseState){

    // a new request starts: forget the old data and error, otherwise an old error would still show
    promiseState.promise = promise;
    promiseState.data = null;
    promiseState.error = null;

    // a null promise only resets the state, there is nothing to wait for
    if (promise){
        promise.then(successACB).catch(failureACB);
    }

    // if an older request finishes after a newer one started, its result is out of date and ignored
    function successACB(result){
        if (promiseState.promise === promise)
            promiseState.data = result;
    }
    function failureACB(someError){
        if (promiseState.promise === promise)
            promiseState.error = someError;
    }
}

// true while the promise is running (started, but neither data nor error yet)
export function isPending(promiseState){
    return Boolean(promiseState.promise) && !promiseState.data && !promiseState.error;
}
