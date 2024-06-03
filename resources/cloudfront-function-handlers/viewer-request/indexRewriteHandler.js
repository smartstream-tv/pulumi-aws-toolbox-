function indexRewriteHandler(request) {
    // Check whether the URI is missing a file name.
    if (request.uri.endsWith('/')) {
        request.uri += 'index.html';
        return request;
    }

    // Check whether the URI is missing a file extension.
    if (!request.uri.includes('.')) {
        request.uri += '/index.html';
        return request;
    }

    return null;
}

