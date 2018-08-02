
export function buildMessage(methodName, data, error = null){
    const msg = {
        data: data,
        metadata: {
            "guid": "",
            "appId": process.env.RECEIVING_APP_ID,
            "methodName": methodName,
            "timestamp": + new Date(),
            "context": ""
        },
        error: error,
    }
    return msg
}