let aws_keys = {
    s3: {
        //apiVersion: '2006-03-01',
        region: 'us-east-2',
        accessKeyId: "",
        secretAccessKey: ""        
    },
    dynamodb: {
        apiVersion: '2012-08-10',
        region: 'us-east-2',
        accessKeyId: "",
        secretAccessKey: ""
    },
    rekognition: {        
        region: 'us-east-2',
        accessKeyId: "",
        secretAccessKey: ""        
    },
    translate:{
        region: 'us-east-2',
        accessKeyId: "",
        secretAccessKey: ""        
    }

}
module.exports = aws_keys
