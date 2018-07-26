/**
 * Since address creation is a hard task that take some time (from 0.5 to 1 second), if we have to create 100 addresses,
 * we need to ensure that they are creating one after another, so our Ethereum node will not fail
 * Here I have a nice solution how to solve this with Promise.mapSeries function
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




const seqPromise = (promiseList)=>{
    const results = [];
    return promiseList.reduce((p, item)=>{
        return p.then(()=>{
            return item().then(data=>{
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