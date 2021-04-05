const express = require('express');
var bodyParser = require('body-parser');
const app = express();
var uuid = require('uuid');
const aws_keys = require('./credentials');
const cors = require('cors');
var corsOptions = { origin: true, optionsSuccessStatus: 200 };

// Constantes
let items_login = [];

// :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// ::::::::::::::::::::::::::    Express    ::::::::::::::::::::::::::
// :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

app.use(cors(corsOptions));
app.use((req, res, next) => {

  // Dominio que tengan acceso (ej. 'http://example.com')
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Metodos de solicitud que deseas permitir
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');

  // Encabecedados que permites (ej. 'X-Requested-With,content-type')
  res.setHeader('Access-Control-Allow-Headers', '*');

  next();
})
app.use(bodyParser.json({ limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
const port = 3333;

app.get('/', (req, res) => {
  res.json({ mensaje: 'Testing server' });
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
const { response } = require('express');
// const { ConfigurationServicePlaceholders } = require('aws-sdk/lib/config_service_placeholders');
// Instanciando los servicios a utilizar y sus accesos.
const s3 = new AWS.S3(aws_keys.s3);
const ddb = new AWS.DynamoDB(aws_keys.dynamodb);
const rek = new AWS.Rekognition(aws_keys.rekognition)
const translate = new AWS.Translate(aws_keys.translate);
// ***************************************************
// *****************    Almacenamiento - S3     *****************
// ***************************************************

// ................................................
// ........ Subir foto a s3 ........
// ................................................
app.post('/subirfotoS3', function (req, res) {

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
// ***************************************************
// *****************      BD      *****************
// ***************************************************

// ................................................
// ........ Login ........
// ................................................
app.post('/login', (req, res) => {
  var user = req.body.user;
  // console.log("usuario: ", user);
  var pass = req.body.pass;

  const callback = result => {
    // console.log("Result: ", result);
    items_login = result.slice();
    console.log("Items: ", items_login);
    console.log("Length: ", items_login.length);
    if (items_login.length >= 1) {
      console.log('Datos correctos');
      var url_foto_ = items_login[0].url_foto.S;
      //res.send({ 'message': url_foto_ });     
      console.log(url_foto_);
      let nombre_imagen = url_foto_.split('/').pop();
      console.log(nombre_imagen);

      const params = {
        Image: {
          S3Object: {
            Bucket: "practica2-g37-imageness",
            Name: "fotos_perfil/" + nombre_imagen
          }
        },
        // Image: { 
        //   // Bytes: Buffer.from(encodedImage, 'base64')
        // }, 
        MaxLabels: 10
      }
      let tags;
      rek.detectLabels(params, function (err, data) {
        if (err) {
          // res.send({mensaje: "Error rekognition"})
          console.log(err, err.stack);
        } else {
          // res.send({labels: data.Labels});
          tags = data.Labels;
          tags = JSON.stringify(tags);
          // console.log("data.labels: ", tags);
          res.send({ 'message': 1, "User": items_login[0], "Tags": tags });
        }
      });


    } else {
      console.log('Datos incorrectos');
      res.send({ 'message': 0 });
    }
  }

  scanLogin(user, pass, callback);
});

async function scanLogin(user, pass, callback) {
  try {      //Consultar un registro
    var params = {
      TableName: 'Usuario',
      FilterExpression: "username = :usrn AND contrasenia = :contr",

      ExpressionAttributeValues: {
        ":usrn": { "S": user },
        ":contr": { "S": pass }
      },
      // ProjectionExpression: 'username'  //Este es solo para obtener un dato en especifico
      // Limit: 10
    };
    var response = await ddb.scan(params).promise();

    itms = response.Items;
    callback(response.Items);
  } catch (error) {
    console.error(error);
  }

}
// ................................................
// ........ Verificar ........
// ................................................
app.post('/verificar', (req, res) => {
  var user = req.body.user;
  // console.log("usuario: ", user);

  const callback = result => {
    // console.log("Result: ", result);
    items_login = result.slice();
    console.log("Items: ", items_login);
    console.log("Length: ", items_login.length);
    if (items_login.length >= 1) {
      console.log('Datos correctos');
      res.send({ 'message': 1, "User": items_login[0] });
    } else {
      console.log('Datos incorrectos');
      res.send({ 'message': 0 });
    }
  }

  scanVerificar(user, callback);
});

async function scanVerificar(user, callback) {
  try {      //Consultar un registro
    var params = {
      TableName: 'Usuario',
      FilterExpression: "username = :usrn",

      ExpressionAttributeValues: {
        ":usrn": { "S": user }
      },
      // ProjectionExpression: 'username'  //Este es solo para obtener un dato en especifico
      // Limit: 10
    };
    var response = await ddb.scan(params).promise();

    itms = response.Items;
    callback(response.Items);
  } catch (error) {
    console.error(error);
  }
}


// ................................................
// ........ Registro ........
// ................................................
app.post('/registro', (req, res) => {

  // var user = req.body.user;
  // console.log("usuario: ", user);
  // var new_user = req.body.foto_b64;

  // console.log(new_user);

  let body = req.body;
  // .....  Obteniendo valores  .....
  // Imagen
  let name = body.foto_nombre;
  let base64String = body.foto_b64.split(',').pop();
  let extension = body.foto_ext;
  let descripcion = "Foto de perfil";
  // Usuario
  let id_user = body.id_user;
  let nombre = body.nombre;
  let contrasenia = body.contrasenia;
  let apellido = body.apellido;
  let username = body.username;
  // Album
  let nombre_album = username + "fotos_perfil";
  let id_album = `${nombre_album}-${uuid()}`;
  //Decodificar imagen
  let encodedImage = base64String;
  let decodedImage = Buffer.from(encodedImage, 'base64');
  let filename = `${name}-${uuid()}.${extension}`; //uuid() genera un id unico para el archivo en s3
  let id_foto = `${name}-${uuid()}`;
  // Obteniendo tags
  const params = {
    /* S3Object: {
      Bucket: "mybucket", 
      Name: "mysourceimage"
    }*/
    Image: {
      Bytes: Buffer.from(encodedImage, 'base64')
    },
    MaxLabels: 10
  }
  let tags;
  rek.detectLabels(params, function (err, data) {
    if (err) {
      // res.send({mensaje: "Error rekognition"})
      console.log(err, err.stack);
    } else {
      // res.send({labels: data.Labels});
      tags = data.Labels;
      tags = JSON.stringify(tags);
      console.log("data.labels: ", tags);
      //Parámetros para S3
      let bucketname = 'practica2-g37-imageness';
      let folder = 'fotos_perfil/';
      let filepath = `${folder}${filename}`;
      var uploadParamsS3 = {
        Bucket: bucketname,
        Key: filepath,
        Body: decodedImage,
        ACL: 'public-read',
      };
      // Callback

      //*** S3 ***
      // Subiendo imagen a S3
      s3.upload(uploadParamsS3, function sync(err, data) {
        if (err) {
          console.log('Error uploading file to S3:', err);
          // res.send({ 'message': 's3 failed' })
          res.send({ 'res': '0' })
        } else {
          console.log('Upload success at:', data.Location);
          //*** DDB ***
          // Guardando en FOTO
          ddb.transactWriteItems({
            TransactItems: [
              {
                Put: {
                  TableName: "Foto",
                  Item: {
                    "id_foto": { S: uuid() },
                    "nombre": { S: name },
                    "url": { S: data.Location },
                    "id_album": { S: id_album },
                    "id_usuario": { S: id_user },
                    "nombre_album": { S: nombre_album },
                    "descripcion": { S: descripcion },
                    "tags": { S: tags }
                  }
                }
              },
              {
                Put: {
                  TableName: "Album",
                  Item: {
                    "id_album": { S: id_album },
                    "nombre": { S: nombre_album },
                    "id_usuario": { S: id_user }
                  }
                }
              },
              {
                Put: {
                  TableName: "Usuario",
                  Item: {
                    "id_usuario": { S: id_user },
                    "apellido": { S: apellido },
                    "contrasenia": { S: contrasenia },
                    "nombre": { S: nombre },
                    "url_foto": { S: data.Location },
                    "username": { S: username }
                  }
                }
              }
            ]
          }, function (err, data) {
            if (err) {
              console.log('Error saving data:', err);
              res.send({ 'message': 'ddb failed' });
              // return;
            } else {
              console.log('Se registro el usuario, foto y album:', data);
              res.send({ 'message': 'ddb success' });
              // return;
              //
            }
          });

        }
      });
    }
  });
});
// ................................................
// ........   Editar   ........
// ................................................
app.post('/editar', (req, res) => {
  // var user = req.body.user;
  // console.log("usuario: ", user);
  // var new_user = req.body.foto_b64;

  // console.log(new_user);

  let body = req.body;
  // .....  Obteniendo valores  .....
  // Imagen
  let name = body.foto_nombre;
  let base64String = body.foto_b64.split(',').pop();
  let extension = body.foto_ext;
  let descripcion = "Foto de perfil";
  let url_foto = body.url_foto;
  // Usuario
  let id_user = body.id_user;
  let nombre = body.nombre;
  let contrasenia = body.contrasenia;
  let apellido = body.apellido;
  let username = body.username;
  // Album
  let nombre_album = username + "fotos_perfil";
  let id_album = `${nombre_album}-${uuid()}`;
  //Decodificar imagen
  let encodedImage = base64String;
  let decodedImage = Buffer.from(encodedImage, 'base64');
  let filename = `${name}-${uuid()}.${extension}`; //uuid() genera un id unico para el archivo en s3
  let id_foto = `${name}-${uuid()}`;
  // Obteniendo tags
  const params = {
    /* S3Object: {
      Bucket: "mybucket", 
      Name: "mysourceimage"
    }*/
    Image: {
      Bytes: Buffer.from(encodedImage, 'base64')
    },
    MaxLabels: 10
  }
  let tags;
  rek.detectLabels(params, function (err, data) {
    if (err) {
      // res.send({mensaje: "Error rekognition"})
      console.log(err, err.stack);
    } else {
      // res.send({labels: data.Labels});
      tags = data.Labels;
      tags = JSON.stringify(tags);
      console.log("data.labels: ", tags);
      //Parámetros para S3
      let bucketname = 'practica2-g37-imageness';
      let folder = 'fotos_perfil/';
      let filepath = `${folder}${filename}`;
      var uploadParamsS3 = {
        Bucket: bucketname,
        Key: filepath,
        Body: decodedImage,
        ACL: 'public-read',
      };
      // Callback

      //*** S3 ***
      // Subiendo imagen a S3
      s3.upload(uploadParamsS3, function sync(err, data) {
        if (err) {
          console.log('Error uploading file to S3:', err);
          // res.send({ 'message': 's3 failed' })
          res.send({ 'res': '0' })
        } else {
          console.log('Upload success at:', data.Location);
          //*** DDB ***
          // Guardando en FOTO
          ddb.transactWriteItems({
            TransactItems: [
              {
                Put: {
                  TableName: "Foto",
                  Item: {
                    "id_foto": { S: uuid() },
                    "nombre": { S: name },
                    "url": { S: data.Location },
                    "id_album": { S: id_album },
                    "id_usuario": { S: id_user },
                    "nombre_album": { S: nombre_album },
                    "descripcion": { S: descripcion },
                    "tags": { S: tags }
                  }
                }
              },
              {
                Put: {
                  TableName: "Album",
                  Item: {
                    "nombre": { S: nombre_album },
                    "id_album": { S: id_album },
                    "id_usuario": { S: id_user }
                  }
                }
              },
              {
                Update: {
                  TableName: "Usuario",
                  Key: {
                    "id_usuario": { S: id_user }
                  },
                  UpdateExpression: "SET apellido = :apell, contrasenia = :contr, nombre = :nomb, url_foto = :url, username = :usrn",
                  ExpressionAttributeValues: {
                    ":apell": { S: apellido },
                    ":contr": { S: contrasenia },
                    ":nomb": { S: nombre },
                    ":url": { S: data.Location },
                    ":usrn": { S: username },
                  }
                }
              }
            ]
          }, function (err, data) {
            if (err) {
              console.log('Error saving data:', err);
              res.send({ 'message': 'ddb failed' });
              // return;
            } else {
              console.log('Se actualizo el usuario, foto y album:', data);
              res.send({ 'message': 'ddb success' });
              // return;
            }
          });

        }
      });
    }
  });
});

// ................................................
//........subir foto y guardar en dynamo........
// ................................................
app.post('/subir', (req, res) => {
  let body = req.body;
  // console.log("body: ", body);
  //Imagen
  let name = body.nombre;
  let descripcion = body.descripcion;
  let base64String = body.foto_b64.split(',').pop();;
  let extension = body.foto_ext;
  // Usuario
  let id_user = body.id_user;
  let username = body.username;
  // Album
  let nombre_album = username + "fotos_publicadas";
  let id_album = `${nombre_album}-${uuid()}`;
  //Decodificar imagen
  let encodedImage = base64String;
  let decodedImage = Buffer.from(encodedImage, 'base64');
  let filename = `${name}-${uuid()}.${extension}`; //uuid() genera un id unico para el archivo en s3
  // Obteniendo tags
  const params = {
    /* S3Object: {
      Bucket: "mybucket", 
      Name: "mysourceimage"
    }*/
    Image: {
      Bytes: Buffer.from(encodedImage, 'base64')
    },
    MaxLabels: 10
  }
  let tags;
  rek.detectLabels(params, function (err, data) {
    if (err) {
      // res.send({mensaje: "Error rekognition"})
      console.log(err, err.stack);
    } else {
      // res.send({labels: data.Labels});
      tags = data.Labels;
      tags = JSON.stringify(tags);
      console.log("data.labels: ", tags);
      //Parámetros para S3
      let bucketname = 'practica2-g37-imageness';
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
              "id_album": { S: id_album },
              "id_usuario": { S: id_user },
              "nombre": { S: name },
              "url": { S: data.Location },
              "nombre_album": { S: nombre_album },
              "descripcion": { S: descripcion },
              "tags": { S: tags }
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
    } // else
  });
  // console.log("tags: ", tags);

});

// ................................................
// ........   Obtener fotos de usuario   ........
// ................................................

app.post('/getFotos', async (req, res) => {
  let body = req.body;
  // Usuario
  //  let id_user = body.id_user;
<<<<<<< HEAD
  let username = body.username;
  // Album
  let nombre_album = username + "fotos_publicadas";
  console.log("Album a buscar: ", nombre_album);

  const callback = result => {
    // console.log("Result: ", result);
    items_album = result.slice();
    console.log("Items: ", items_album);
    console.log("Length: ", items_album.length);
    if (items_album.length >= 1) {
      console.log('Se encontraron albumes');
      // var url_foto_= items_album[0].url_foto.S;
      res.send({ 'message': 1, 'fotos': items_album });
      console.log(items_album);

    } else {
      console.log('No hay albumes');
      res.send({ 'message': 0 });
=======
   let username = body.username;
   let album = body.album;
  // Album
   let nombre_album = username + album;
   console.log("Album a buscar: ", nombre_album);

   const callback = result => {
      // console.log("Result: ", result);
      items_album = result.slice();
      console.log("Items: ", items_album);
      console.log("Length: ", items_album.length);
      if (items_album.length >= 1) {
        console.log('Se encontraron albumes');
        // var url_foto_= items_album[0].url_foto.S;
        res.send({ 'message': 1, 'fotos': items_album });
        console.log(items_album);
        
      } else {
        console.log('No hay albumes');
        res.send({ 'message': 0 });
      }
>>>>>>> 798846df5a82570efc09925d4814a5d9fd8916f4
    }
  }

  scanGetFotos(nombre_album, callback);
});

async function scanGetFotos(nombre_album, callback) {
  try {      //Consultar un registro
    var params = {
      TableName: 'Foto',
      FilterExpression: "nombre_album = :nalbum",

      ExpressionAttributeValues: {
        ":nalbum": { "S": nombre_album }
      },
      // ProjectionExpression: 'username'  //Este es solo para obtener un dato en especifico
      // Limit: 10
    };
    var response = await ddb.scan(params).promise();

    itms = response.Items;
    callback(response.Items);
  } catch (error) {
    console.error(error);
  }
}

//####################################################
//....... INICIAR SESION COMPARANDO 2 FOTOS  .........
//####################################################
app.post('/loginPorFoto', (req, res) => {

  var user = req.body.username;
  //obtener base64 de la imagen 
  let imagenBytes = req.body.imagen.split(',').pop();

  const callback = result => {
    // console.log("Result: ", result);
    items_login = result.slice();
    //console.log("Items: ", items_login);
    //console.log("Length: ", items_login.length);
    if (items_login.length >= 1) {
      console.log('Datos correctos');
      var url_foto_ = items_login[0].url_foto.S;
      //res.send({ 'message': url_foto_ });     
      console.log(url_foto_);

      let nombre_imagen = url_foto_.split('/').pop();
      console.log("nombre_imagen: ", nombre_imagen);

      var params = {
        SourceImage: {
          //Bytes: Buffer.from(imagen1, 'base64')     
          /*podria colocarse la imagen de un bucket*/
          S3Object: {
            Bucket: "practica2-g37-imageness",
            Name: "fotos_perfil/" + nombre_imagen
          }
        },
        TargetImage: {
          Bytes: Buffer.from(imagenBytes, 'base64')
          /*S3Object: {
            Bucket: "practica2-g37-imageness", 
            Name: "pruebas/paul1.jpg"
            }*/
        },
        SimilarityThreshold: '80'
      }

      rek.compareFaces(params, function (err, data) {
        if (err) {
          console.log(err, err.stack);
          res.send({ 'message': 0 });
        }
        else {
          res.send({ 'message': 1, "User": items_login[0], 'Data_face': data.FaceMatches });
          data.FaceMatches.forEach(data => {
            let position = data.Face.BoundingBox
            let similarity = data.Similarity
            console.log(`The face at: ${position.Left}, ${position.Top} matches with ${similarity} % confidence`)
          })

        }
      });

    } else {
      console.log('Datos incorrectos');
      res.send({ 'message': 0 });
    }
  }

  scanLoginFoto(user, callback);
});

async function scanLoginFoto(user, callback) {
  try {      //Consultar un registro
    var params = {
      TableName: 'Usuario',
      FilterExpression: "username = :usrn ",
      ExpressionAttributeValues: {
        ":usrn": { "S": user }
      },
      // ProjectionExpression: 'url_foto'  //Este es solo para obtener un dato en especifico
      // Limit: 10
    };
    var response = await ddb.scan(params).promise();
    callback(response.Items);
  } catch (error) {
    console.error(error);
  }
}


//###############################################
//#### TRADUCIR LA DESCRIPCION DE LA FOTO #######
//###############################################
app.post('/traducirDescripcion', (req, res) => {
  let descripcion = req.body.descripcion;
  let idioma_destino = req.body.idioma;

  let params = {
    SourceLanguageCode: 'auto',
    TargetLanguageCode: idioma_destino,
    Text: descripcion
  };

  translate.translateText(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
      res.send({ error: err })
    } else {
      console.log(data);
      res.send({ message: data })
    }
  });
});

//###############################################
//######## OBTENER TEXTO DE IMAGENES  ###########
//###############################################
app.post('/obtenerTexto', function (req, res) {  
  let base64String = req.body.foto.split(',').pop();; //recibe la imagen y le quita la coma
  let imagen = base64String;
  let params = {    
    Image: {
      Bytes: Buffer.from(imagen, 'base64')
    }
  };
  rek.detectText(params, function (err, data) {
    if (err) {
      res.json({ mensaje: "Error" })
    }
    else {
      res.json({ texto: data.TextDetections});
    }
  });
});
