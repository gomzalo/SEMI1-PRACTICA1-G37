const express = require('express');
var bodyParser = require('body-parser');
const app = express();
var uuid = require('uuid');
const aws_keys = require('./credentials');
const cors = require('cors');
var corsOptions = {origin: true, optionsSuccessStatus: 200};


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


const db_credentials = require('./db_credentials');
// var conn = mysql.createPool(db_credentials);

// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// ::::::::::::::::::::::::::    Instanciando SDK AWS    ::::::::::::::::::::::::::
// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

var AWS = require('aws-sdk');
// Instanciando los servicios a utilizar y sus accesos.
const s3 = new AWS.S3(aws_keys.s3);

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
  
  //subir foto y guardar en dynamo
  app.post('/saveImageInfoDDB', (req, res) => {
    let body = req.body;
  
    let name = body.name;
    let base64String = body.base64;
    let extension = body.extension;
  
    //Decodificar imagen
    let encodedImage = base64String;
    let decodedImage = Buffer.from(encodedImage, 'base64');
    let filename = `${name}-${uuid()}.${extension}`; //uuid() genera un id unico para el archivo en s3
  
    //Parámetros para S3
    let bucketname = 'bucket';
    let folder = 'fotos/';
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
          TableName: "dynamodbtable",
          Item: {
            "id": { S: uuid() },
            "name": { S: name },
            "location": { S: data.Location }
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
  
  //obtener datos de la BD
  app.get("/getdata", async (req, res) => {
    conn.query(`SELECT * FROM ejemplo`, function (err, result) {
      if (err) throw err;
      res.send(result);
    });
  });
  
  //insertar datos
  app.post("/insertdata", async (req, res) => {
    let body = req.body;
    conn.query('INSERT INTO ejemplo VALUES(?,?)', [body.id, body.nombre], function (err, result) {
      if (err) throw err;
      res.send(result);
    });
  });