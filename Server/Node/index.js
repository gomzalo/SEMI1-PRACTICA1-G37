const express = require('express');
var bodyParser = require('body-parser');
const app = express();
var uuid = require('uuid');
const aws_keys = require('./credentials');
const cors = require('cors');
var corsOptions = {origin: true, optionsSuccessStatus: 200};

// Constantes
let items_login = [];

// :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// ::::::::::::::::::::::::::    Express    ::::::::::::::::::::::::::
// :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

app.use(cors(corsOptions));
app.use(bodyParser.json({limit: '10mb', extended: true}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
const port = 3333;

app.get('/', (req, res) =>{
    res.json({mensaje: 'Testing server'});
})

app.listen(port, () => {
    console.log('Listening on http://localhost:' + port + '/', port);
})


// const db_credentials = require('./db_credentials');
// var conn = mysql.createPool(db_credentials);

// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// ::::::::::::::::::::::::::    Instanciando SDK AWS    ::::::::::::::::::::::::::
// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

var AWS = require('aws-sdk');
// Instanciando los servicios a utilizar y sus accesos.
const s3 = new AWS.S3(aws_keys.s3);
const ddb = new AWS.DynamoDB(aws_keys.dynamodb);

// *****************    Almacenamiento - S3     *****************

//subir foto en s3
app.post('/subirfoto', function (req, res) {

    var id = req.body.id;
    var foto = req.body.foto;
    console.log('Imagen: ' + req.body);
    //carpeta y nombre que quieran darle a la imagen
  
    // var nombrei = "fotos_perfil/" + id + ".jpg";
    var nombrei = "fotos_publicadas/" + id + ".jpg";
    //se convierte la base64 a bytes
    let buff = new Buffer.from(foto, 'base64');
  
    const params = {
      Bucket: "practica1-g37-imagenes",
      Key: nombrei,
      Body: buff,
      ContentType: "image",
      ACL: 'public-read'
    };
  
    const putResult = s3.putObject(params).promise();
    res.json({ mensaje: putResult })
  
  });
  
  //obtener foto en s3
  app.post('/obtenerfoto', function (req, res) {
    var id = req.body.id;
    //direcccion donde esta el archivo a obtener
    var nombrei = "fotos_perfil/" + id + ".jpg";
    var getParams = {
      Bucket: 'practica1-g37-imagenes',
      Key: nombrei
    }
    s3.getObject(getParams, function (err, data) {
      if (err)
        res.json({ mensaje: "error" })
      //de bytes a base64
      var dataBase64 = Buffer.from(data.Body).toString('base64');
      res.json({ mensaje: dataBase64 })
  
    });
  
  });
  
  // *****************      BD      *****************
  
  // ........ Login ........

  app.post('/login', (req, res) => {
    var user = req.body.user;
    // console.log("usuario: ", user);
    var pass = req.body.pass;
   
    const callback = result => {
      // console.log("Result: ", result);
      items_login = result.slice();
      console.log("Items: ", items_login);
      console.log("Length: ", items_login.length);
      if(items_login.length >= 1){
        console.log('Datos correctos');
        res.send({ 'message': 1, "User": items_login[0] });
      }else{
        console.log('Datos incorrectos');
        res.send({ 'message': 0 });
      }
    }
    
    scanLogin(user, pass, callback);
  });

async function scanLogin(user, pass, callback){
    try{      //Consultar un registro
      var params = {
          TableName: 'Usuario',
          FilterExpression: "username = :usrn AND contrasenia = :contr",

          ExpressionAttributeValues: {
              ":usrn": {"S": user},
              ":contr": {"S": pass}
          },
          // ProjectionExpression: 'username'  //Este es solo para obtener un dato en especifico
          // Limit: 10
      };
      var response = await ddb.scan(params).promise();
      
      itms = response.Items;
      callback(response.Items);
    } catch (error){
      console.error(error);
    }
}

// ........ Registro ........
app.post('/registro', (req, res) => {
  // var user = req.body.user;
  // console.log("usuario: ", user);
    var new_user = req.body.data;
    console.log(new_user);
    
    let body = req.body;
  
    let name = body.name;
    let base64String = body.base64;
    let extension = body.extension;
  
    //Decodificar imagen
    let encodedImage = base64String;
    let decodedImage = Buffer.from(encodedImage, 'base64');
    let filename = `${name}-${uuid()}.${extension}`; //uuid() genera un id unico para el archivo en s3
  
    //Parámetros para S3
    let bucketname = 'practica1-g37-imagenes';
    let folder = 'fotos_publicadas/';
    let filepath = `${folder}${filename}`;
    var uploadParamsS3 = {
      Bucket: bucketname,
      Key: filepath,
      Body: decodedImage,
      ACL: 'public-read',
    };
  
    s3.upload(uploadParamsS3, function sync(err, data) {
      if (err) {
        console.log('Error uploading file:', err);
        res.send({ 'message': 's3 failed' })
      } else {
        console.log('Upload success at:', data.Location);
        ddb.putItem({
          TableName: "Usuario",
          Item: {
              'nombre': { S: new_user.nombre_id},
              'contrasenia': { S: new_user.contrasena_id},
              'apellido': { S: new_user.username_id},
              'url_foto': { S: new_user.url_foto},
              'id_usuario': { S: new_user.id_usuario}
          }
        }, function (err, data) {
          if (err) {
            console.log('Error saving data:', err);
            res.send({ 'message': 'ddb failed' });
          } else {
            console.log('Save success:', data);
            res.send({ 'message': 'ddb success' });
          }
        });
      }
    });
})
//subir foto y guardar en dynamo
app.post('/subirImagenDB', (req, res) => {
    let body = req.body;
  
    let name = body.name;
    let base64String = body.base64;
    let extension = body.extension;
  
    //Decodificar imagen
    let encodedImage = base64String;
    let decodedImage = Buffer.from(encodedImage, 'base64');
    let filename = `${name}-${uuid()}.${extension}`; //uuid() genera un id unico para el archivo en s3
  
    //Parámetros para S3
    let bucketname = 'practica1-g37-imagenes';
    let folder = 'fotos_publicadas/';
    let filepath = `${folder}${filename}`;
    var uploadParamsS3 = {
      Bucket: bucketname,
      Key: filepath,
      Body: decodedImage,
      ACL: 'public-read',
    };
  
    s3.upload(uploadParamsS3, function sync(err, data) {
      if (err) {
        console.log('Error uploading file:', err);
        res.send({ 'message': 's3 failed' })
      } else {
        console.log('Upload success at:', data.Location);
        ddb.putItem({
          TableName: "Foto",
          Item: {
            "id_foto": { S: uuid() },
            "nombre": { S: name },
            "url": { S: data.Location },
            "id_album": { S: 'prueba' },
            "id_usuario": { S: 'hjkasdhfkjasdhfljk' }
          }
        }, function (err, data) {
          if (err) {
            console.log('Error saving data:', err);
            res.send({ 'message': 'ddb failed' });
          } else {
            console.log('Save success:', data);
            res.send({ 'message': 'ddb success' });
          }
        });
      }
    });
  })
  