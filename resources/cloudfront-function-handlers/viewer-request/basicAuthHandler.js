function basicAuthHandler(request) {
    var authExpected = 'Basic __BASIC_AUTH__';
    var authHeader = request.headers.authorization;
    if (typeof authHeader == 'undefined' || authHeader.value !== authExpected) {
        return {
            statusCode: 401,
            statusDescription: 'Unauthorized',
            headers: {
                "www-authenticate": { value: 'Basic realm="Access is restricted", charset="UTF-8"' }
            }
        }
    } else {
        return null;
    }
}
