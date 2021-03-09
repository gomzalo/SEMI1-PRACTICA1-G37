import boto3
import flask
from boto3.dynamodb.conditions import Key, Attr
from flask import Flask
from flask import json
from flask import request
from flask.json import jsonify
import requests
import base64

app = Flask(__name__)
#########################################
#PARA VALIDAR EL LOGIN
#########################################
@app.route('/login/', methods=['POST'])
def login():
    data = flask.request.json 
    usuario =  data["user"] 
    password = data["pass"]    
    #Verificacion en la base de datos
    dynamo_server = boto3.resource('dynamodb', aws_access_key_id="",
                      aws_secret_access_key="",
                      region_name="us-east-2")
    tabla_ = dynamo_server.Table('Usuario')
    response = tabla_.scan(   
    FilterExpression=Attr('username').eq(usuario) & Attr('contrasenia').eq(password))    
    print(response["Items"])

@app.route('/registrar/', methods=['POST'])
def login():
    data = flask.request.json 
    id = data["id"]
    usuario =  data["user"] 
    password = data["pass"]    
    nombre = data["nombre"]    
    apellido = data["apellido"]    
    foto = data["foto"]
    
    dynamo_server = boto3.resource('dynamodb', aws_access_key_id="",
                      aws_secret_access_key="",
                      region_name="us-east-2")
    tabla_ = dynamo_server.Table('Usuario')
    tabla_.put_item(
    Item={    
        'id_usuario': id,
        'username': usuario, 
        'nombre': nombre, 
        'apellido': apellido,
        'contrasenia': password,
        'url_foto': foto 
    }
)


if __name__ == '__main__':
    app.run('0.0.0.0',3333, debug=True)

