export function resolvePromise(promise, promiseState){
//如果api1 call resolves在api2call之后 他应该被忽略 因为已经过时
    
    promiseState.promise=promise;
    promiseState.data=null;
    promiseState.error=null;//当我们开始一个新的请求时，我们需要重置之前的状态。忘掉之前的数据 因为如果上一次请求失败 error里还有值

    if (promise){//当promise存在时才会有下面的 the promise only executes when it's truthy，如果是null，promise state should still be set (reset in this case) but the promise shouldn't be executed.
        promise.then(successACB).catch(failureACB);
    }

    function successACB(result){
        if (promiseState.promise === promise)//resolvePromise check for race condition 
            promiseState.data = result;//resolvePromise sets data after the promise resolves
    }
    function failureACB(someError){
        if (promiseState.promise === promise)//resolvePromise check for race condition 
            promiseState.error = someError;//resolvePromise sets error after the promise rejects

    }

}