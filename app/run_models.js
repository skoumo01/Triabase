'use strict';
const Client = require('fabric-client');
const { exit } = require('process');

var myArgs = process.argv.slice(2);
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models submitModel token id_0 tag1 tag2 model_str
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models getLatest token id_1
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models getHistory token id_0 false 1613556418 1613556450
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models queryAdHoc token '{"selector":{"tag1":"tag1"}}' 2 ''
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models getTag1 token tag1 10 ''
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models getTag2 token tag2 10 ''
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models getTag12 token tag1 tag2 10 ''
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models checkToken token
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models createToken token

// Argument Parcing
const ORG_NAME = myArgs[0];
const USER_NAME = myArgs[1];
const PEER_NAME = myArgs[2];
const CHANNEL_NAME = myArgs[3];
const CHAINCODE_ID = myArgs[4];
const FUNCTION_CALL = myArgs[5];
const TOKEN = myArgs[6];
var MODEL_ID = "";    
var TAG1 = "";
var TAG2 = "";
var MODEL_STR = "";
var IS_BOUNDED = "";
var MIN_TIMESTAMP = "";
var MAX_TIMESTAMP = "";
var QUERY_STR = "";
var TAG1 = "";
var TAG2 = "";
var PAGE_SIZE = "";
var BOOKMARK = "";
if (FUNCTION_CALL==='submitModel'){
    MODEL_ID = myArgs[7];    
    TAG1 = myArgs[8];    
    TAG2 = myArgs[9];    
    MODEL_STR = myArgs[10];
}else if (FUNCTION_CALL==='getLatest'){
    MODEL_ID = myArgs[7];
}else if (FUNCTION_CALL==='getHistory'){
    MODEL_ID = myArgs[7];
    IS_BOUNDED = myArgs[8]; // "true"/"false"
    MIN_TIMESTAMP = myArgs[9];
    MAX_TIMESTAMP = myArgs[10];
}else if (FUNCTION_CALL==='queryAdHoc'){
    QUERY_STR = myArgs[7];
    PAGE_SIZE = myArgs[8];
    BOOKMARK = myArgs[9];
}else if (FUNCTION_CALL==='getTag1'){
    TAG1 = myArgs[7];
    PAGE_SIZE = myArgs[8];
    BOOKMARK = myArgs[9];
}else if (FUNCTION_CALL==='getTag2'){
    TAG2 = myArgs[7];
    PAGE_SIZE = myArgs[8];
    BOOKMARK = myArgs[9];
}else if (FUNCTION_CALL==='getTag12'){
    TAG1 = myArgs[7];
    TAG2 = myArgs[8];
    PAGE_SIZE = myArgs[9];
    BOOKMARK = myArgs[10];
}

// Constants for profile
const CONNECTION_PROFILE_PATH = './profiles/dev-connect.yaml';

var CLIENT_CONNECTION_PROFILE_PATH;
// Client section configuration
if (ORG_NAME === 'org1') {
    CLIENT_CONNECTION_PROFILE_PATH = './profiles/org1-client.yaml';
} else if (ORG_NAME === 'org2') {
    CLIENT_CONNECTION_PROFILE_PATH = './profiles/org2-client.yaml';
} else {
    console.log("Exiting : Ivalid Organization name");
    exit(0);
}


// Variable to hold the client
var client = {}
// Variable to hold the channel
var channel = {}

if (require.main === module){
    main();
}

async function main() {

    client = await setupClient();

    channel = await setupChannel();

    if (FUNCTION_CALL==='submitModel'){
        //generate pseudo model data
        var Tx = {};
        Tx.tag1 = TAG1;
        Tx.tag2 = TAG2;
        Tx.serialization_encoding = "base64";
        
        var generic = {};
        var metadata = {}
        metadata.identifier = "id";
        metadata.original_format = "format";
        generic.metadata = metadata;
        generic.serialized_data = "string";

        Tx.model = [generic, generic];
        Tx.weights = [generic];
        Tx.initialization = [];
        Tx.checkpoints = [generic, generic];

        //simple POST
        submitModel(Tx);

    }else if (FUNCTION_CALL==='getLatest'){
        //simple GET
        getLatest(MODEL_ID);
        
    }else if (FUNCTION_CALL==='getHistory'){
        //retrieves (un)bounded model history (i.e. submitted versions)
        getHistory(MODEL_ID, IS_BOUNDED, MIN_TIMESTAMP, MAX_TIMESTAMP);

    }else if (FUNCTION_CALL==='queryAdHoc'){
        // retrieves models using the provided CouchDB ad hoc query
        queryAdHoc(QUERY_STR, PAGE_SIZE, BOOKMARK);

    }else if (FUNCTION_CALL==='getTag1'){
        // retrieves models with the given tag1
        getTag1(TAG1, PAGE_SIZE, BOOKMARK);

    }else if (FUNCTION_CALL==='getTag2'){
        // retrieves models with the given tag2
        getTag2(TAG2, PAGE_SIZE, BOOKMARK);

    }else if (FUNCTION_CALL==='getTag12'){
        // retrieves models with the given tags
        getTag12(TAG1, TAG2, PAGE_SIZE, BOOKMARK);

    }else if (FUNCTION_CALL==='createToken'){
        // creates a new client token; i.e. authorizes a new client
        createToken();

    }else if (FUNCTION_CALL==='checkToken'){
        // checks if the client token is valid; authorization check
        checkToken();

    }
}

async function submitModel(tx_data) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    var tx_id = client.newTransactionID();
    let tx_id_string = tx_id.getTransactionID();
    
    console.log();

    var request = {
        targets: peerName,
        chaincodeId: CHAINCODE_ID,
        fcn: 'SubmitModelEntry',
        args: [TOKEN, MODEL_ID, JSON.stringify(tx_data)],
        chainId: CHANNEL_NAME,
        txId: tx_id
    };


    console.log("#1 Transaction proposal successfully sent to channel.")
    try{
        let results = await channel.sendTransactionProposal(request);
        
        // Array of proposal responses
        var proposalResponses = results[0];

        var proposal = results[1];

        var all_good = true;
        for (var i in proposalResponses) {
            let good = false
            if (proposalResponses && proposalResponses[i].response &&
                proposalResponses[i].response.status === 200) {
                good = true;
                console.log(`\tChaincode invocation proposal response #${i} was good`);
            } else {
                console.log(`\tChaincode invocation proposal response #${i} was bad!`);
            }
            all_good = all_good & good
        }
        console.log("#2 Looped through the proposal responses all_good=", all_good)

        await setupTxListener(tx_id_string)
        console.log('#3 Registered the Tx Listener')

        var orderer_request = {
            txId: tx_id,
            proposalResponses: proposalResponses,
            proposal: proposal
        };

        await channel.sendTransaction(orderer_request);
        console.log("#4 Transaction has been submitted.")

    }catch{
        //console.log('(Error: Failed to complete the transaction lifecycle procedure. '+
         //               'Please ensure that the provided connection data is valid.')
        exit(0);
    }
    

}

async function getLatest(model_id) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'GetLatestVersion',
         args: [TOKEN, model_id]
     };

    // send the query proposal to the peer
    var response = await channel.queryByChaincode(request);
    console.log(response.toString());
     
     

    return 
}

async function getHistory(model_id, is_bounded, min_timestamp, max_timestamp) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'GetVersionRange',
         args: [TOKEN, model_id, is_bounded, min_timestamp, max_timestamp]
     };

     // send the query proposal to the peer
    let response = await channel.queryByChaincode(request);
    if (response.toString() === 'false'){
        throw new Error('Error: error in simulation: transaction returned with failure: Error: The Model ' + model_id + ' does not exist');
    }else{
        console.log(response.toString());
    }

    return 
}

async function queryAdHoc(query_string, page_size, bookmark) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'QueryModelsWithPagination',
         args: [TOKEN, query_string, page_size, bookmark]
     };

     // send the query proposal to the peer
    let response = await channel.queryByChaincode(request);
    console.log(response.toString());

    return 
}

async function checkToken() {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'CheckClientToken',
         args: [TOKEN]
     };

     // send the query proposal to the peer
    let response = await channel.queryByChaincode(request);
    console.log(response.toString());

    return 
}

async function createToken() {

    let peerName = channel.getChannelPeer(PEER_NAME)

    var tx_id = client.newTransactionID();
    let tx_id_string = tx_id.getTransactionID();
    
    var request = {
        targets: peerName,
        chaincodeId: CHAINCODE_ID,
        fcn: 'CreateClientToken',
        args: [TOKEN],
        chainId: CHANNEL_NAME,
        txId: tx_id
    };


    //console.log("#1 Transaction proposal successfully sent to channel.")
    try{
        let results = await channel.sendTransactionProposal(request);
        
        // Array of proposal responses
        var proposalResponses = results[0];

        var proposal = results[1];

        var all_good = true;
        for (var i in proposalResponses) {
            let good = false
            if (proposalResponses && proposalResponses[i].response &&
                proposalResponses[i].response.status === 200) {
                good = true;
                //console.log(`\tChaincode invocation proposal response #${i} was good`);
            } else {
                //console.log(`\tChaincode invocation proposal response #${i} was bad!`);
            }
            all_good = all_good & good
        }
        //console.log("#2 Looped through the proposal responses all_good=", all_good)

        await setupTxListener(tx_id_string)
        //console.log('#3 Registered the Tx Listener')

        var orderer_request = {
            txId: tx_id,
            proposalResponses: proposalResponses,
            proposal: proposal
        };

        await channel.sendTransaction(orderer_request);
        //console.log("#3 Transaction has been submitted.")

    }catch{
        //console.log('(Error: Failed to complete the transaction lifecycle procedure. '+
         //               'Please ensure that the provided connection data is valid.')
        exit(0);
    }
    
}

async function getTag1(tag1, page_size, bookmark){
    await queryAdHoc('{"selector":{"tag1":"' + tag1 + '"}}', page_size, bookmark);
}
async function getTag2(tag2, page_size, bookmark){
    await queryAdHoc('{"selector":{"tag2":"' + tag2 + '"}}', page_size, bookmark);
}
async function getTag12(tag1, tag2, page_size, bookmark){
    await queryAdHoc('{"selector":{"$and":[{"tag1":"' + tag1 + '"},{"tag2":"' + tag2 + '"}]}}', page_size, bookmark);
}


async function setupTxListener(tx_id_string) {

    try{
        let event_hub = channel.getChannelEventHub(PEER_NAME);

        event_hub.registerTxEvent(tx_id_string, (tx, code, block_num) => {
            
            var response = {};
            response.tx_id = tx_id_string;
            response.code = code;
            response.status = 'VALID';          
            response.blocknumber = block_num;
        
            console.log("#5 Received Tx Event")
            console.log('The chaincode invoke chaincode transaction has been committed on peer %s', event_hub.getPeerAddr());
            console.log('Transaction %s is in block %s', tx, block_num);
            
            if (code !== 'VALID') {
                response.status = 'INVALID';
            }
            
            console.log(JSON.stringify(response));
        },
            // 3. Callback for errors
            (err) => {
                console.log(JSON.stringify({}));
                //console.log(err);
            },
            { unregister: true, disconnect: true }
        );

        event_hub.connect();
    }catch{
        throw new Error('Listener Error.')
    }
}

async function setupClient() {

    const client = Client.loadFromConfig(CONNECTION_PROFILE_PATH)

    client.loadFromConfig(CLIENT_CONNECTION_PROFILE_PATH)

    await client.initCredentialStores()
        .then((done) => {
            //console.log("initCredentialStore(): ", done)
        })

    let userContext = await client.loadUserFromStateStore(USER_NAME)
    if (userContext == null) {
        //console.log("User NOT found in credstore: ", USER_NAME)
        process.exit(1)
    }

    client.setUserContext(userContext, true)

    return client
}

async function setupChannel() {

    
    try {
        // for debugging
        //console.log(await client.queryChannels(PEER_NAME,true))

        channel = await client.getChannel(CHANNEL_NAME, true)
    } catch (e) {
        console.log("Could NOT create channel: ", CHANNEL_NAME)
        process.exit(1)
    }

    return channel
}

// for testing
/*function generateBase64String(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}*/
