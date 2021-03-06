# SEMI1-PRACTICA1-G37
Práctica 1 del laboratorio del curso Seminario de Sistemas 1

# MANUAL DE CONFIGURACIONES

El siguiente manual, muestra los pasos a seguir para configurar los servicios de AWS que se utilizaron para resolver la práctica.
## INSTANCIAS EC2
Primero que nada se creara un usuario IAM, para uso especifico del servicio EC2 de Amazon Web Services.


![Usuario IAM - EC2](Img/ec2iamuser.png "Usuario IAM - EC2")

Se observa que el usuario no tiene permisos de administrador, pues no puede ver los demas usuarios IAM en la cuenta.
Hecho esto, se creará la instancia en donde se crearán los servidores, esto es tanto para el servidor de Node.js y de Python.

![Instancia - EC2](Img/ec2instance.png "Instancia - EC2")

En nuestro caso usamos una instancia Ubuntu Server 20.04, con almacenamiento de 8GB (que cubre la capa gratuita de AWS).
Y en esta instancia, o máquina virtual, estaremos trabajando y levanddo nuestro servidor.

### Servidor Node.js

