function base64(imagen) {
    const imageToBase64 = require('image-to-base64');
    imageToBase64(imagen)
    .then(
        (repsonse) => {
            console.log(response);
            return response;
        }
    ).catch(
        (error) => {
            console.log(error); // Logs an error if there was one
            return error;
        }
    );
}

// module.exports = base64;