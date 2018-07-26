/**
 * Application enter point
 */


require('module-alias/register')
import {Promise} from "bluebird"
import {EthereumNode} from "@blockchain/ethereumNode";
const node = new EthereumNode()

const promiseList = []
for(let i = 0; i < 3; i++){
    promiseList.push(node.getNewAddress.bind(this, "password"))
}

Promise.mapSeries(promiseList, func => {
        return func();
    })
    .then((data) => {
        console.log('data', data);
    })
    .catch(ex=>{
        console.log("ex", ex)
    })


function seqPromise(promiseList) {
    const results = [];
    return promiseList.reduce(function(p, item) {
        return p.then(function() {
            return item().then(function(data) {
                results.push(data);
                return results;
            });
        });
    }, Promise.resolve());
}
seqPromise(promiseList)
    .then((data) => {
        console.log('data', data);
    })
    .catch(ex=>{
        console.log("ex", ex)
    })