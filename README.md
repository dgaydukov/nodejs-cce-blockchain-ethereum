# Node.js CCE (Crypto Currency Exchange) BlockChain Ethereum

## Content
* [Project Description](#project-description)
* [Project Structure](#project-structure)
* [Built With](#built-with)
* [Installation](#installation)
* [Auto Testing](#auto-testing)
* [Kafka](#kafka)
* [Geth Testnet](#geth-testnet)
* [Module loading](#module-loading)
* [Authors](#authors)


### Project Description
Ethereum Proxy is a project to connect Ethereum node (geth) and CCE. Communication works through Kafka. Communication with bitcoin node works
through json RPC.


### Project Structure
```
dist - javascript folder with compiled typescript from src folder
src - source code folder (typescript)
-logic - project bisyness logic
-deamons - deamons that constantly run
--balanceCheck.ts
--mempoolTxCheck.ts
--txConfirmationCheck.ts
-kafka - kafkaconnector logic
-db - database folder (interfaces & models)
```

### Built With

* [Kafka](https://kafka.apache.org/quickstart) - how to install & run kafkCoa
* [KafkaJs](https://www.npmjs.com/package/kafka-node) - node.js module for kafka
* [MongoDb](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu) - how to install & run mongo
* [Mongoose](https://www.npmjs.com/package/mongoose) - node.js module for mongoDb
* [Ethereum](https://www.ethereum.org) - ethereum
* [Web3](https://github.com/ethereum/web3.js) - node.js module for ethereum





### Installation

```shell
#run mongod
sudo service mongod start

#run zookeepr & kafka
sudo service zookeeper start
cd kafka && bin/kafka-server-start.sh config/server.properties


#clone & run project
git clone https://github.com/dgaydukov/nodejs-cce-blockchain-ethereum.git
cd nodejs-cce-blockchain-ethereum
npm i
npm start
# $pid - process id in pm2
npm start $pid --timestamp

#create kafka topics
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic ethereumProxyRequest
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic ethereumProxyResponse


# run deamons
npm run bcheck
npm run txcheck
npm run mptcheck
```




### Auto Testing

You can run auto tests with `npm test`
For testing purpose we use the following arhitecture
testing framework + assertion module + test doubles + code coverage
* [Mocha](https://mochajs.org) - testing framework
* [Chai](http://www.chaijs.com) - assertion module
* [Sinon](http://sinonjs.org) - test doubles
* [Mocha](https://github.com/gotwarlost/istanbul) - code coverage

### Kafka


```shell
# 1. Create kafka topics
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic ethereumProxyRequest
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic ethereumProxyResponse

# 2. Listen kafka responses from Ethereum proxy
bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic ethereumProxyResponse --from-beginning

# 3. Generate new ethereum address
bin/kafka-console-producer.sh --broker-list localhost:9092 --topic ethereumProxyRequest
{"data":{},"metadata":{"guid":"123","methodName":"getAddress","timestamp":"","context":""}}

# 4. Send Ethereum transaction
bin/kafka-console-producer.sh --broker-list localhost:9092 --topic ethereumProxyRequest
{"data":{"to":"2NFpchMYyRTrY6eCr9YuiYQ62g6CdUjWfbk", "amount": "0.01"},"metadata":{"guid":"123","methodName":"sendTransaction","timestamp":"","context":""}}
```


### Geth Testnet

To check out the system you can get money from free [faucet](http://faucet.ropsten.be:3001)
To check you balance you can use [this](https://ropsten.etherscan.io/tx/0xc068a513bd346afd3e50b99ab5d4cdd5c9ecf069b172506b260457984bceab4a) website


Command to run inside geth console
```shell
# run geth
geth --testnet --syncmode fast --rpc --rpcapi eth,net,web3,personal,txpool --rpcport=8545 --cache 1024

# attach to geth console
geth attach http://:8545
geth attach ~/.ethereum/testnet/geth.ipc

# exit from geth console
exit


#vew list of all accounts
ls -lh ~/.ethereum/keystore/

# connect (attach) to ethereum node
geth attach /srv/devnode/ethereum/geth.ipc

# create new account with password: admin
personal.newAccount("admin")

# get balance of account
eth.getBalance("0x94f4fd6219851cce017874009b9f80ad8df4a7fd")

# unlock account for 30 seconds to make transaction
personal.unlockAccount("0x94f4fd6219851cce017874009b9f80ad8df4a7fd", "admin", 30)

# send transaction (note: amount should be in wei, 1 ether = 10**18 wei)
eth.sendTransaction({from:"0x94f4fd6219851cce017874009b9f80ad8df4a7fd", to:"0x40Db6aC6887C3b95008d826BC046ED15d09D8299", value: 1000000000000000})

# get txpool transaction (need to pass txpool when run ethereum node)
txpool.content
```





### Module loading

For modules loading inside the project we use [module-alias](https://www.npmjs.com/package/module-alias). For this we write in package.json
```json
  "_moduleAliases": {
    "@root": "dist",
    "@db": "dist/db",
    "@logic": "dist/logic"
  }
```
But this only for compiled javascript to work. In order to use this functionality in typescript and compile successfully, we use standartd
typescript functions. For this purpose we write in typescript config ts.config.json the following
```json
{
    "baseUrl": ".",
    "paths": {
      "@root/*": ["src/*"],
      "@db/*": ["src/db/*"],
      "@logic/*": ["src/logic/*"]
      }
}
```




## Authors

* **Gaydukov Dmitiry** - *Take a look* - [How to become a Senior Javascript Developer](https://github.com/dgaydukov/how-to-become-a-senior-js-developer)



















