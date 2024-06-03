function cacheControlHandler(response) {
    const immutable = __IMMUTABLE__;

    if (immutable) {
        response.headers['cache-control'] = { value: "public, max-age=2592000, immutable" };
    } else {
        // response can be stored in caches, but the response must be validated with the origin server before each re-use
        response.headers['cache-control'] = { value: "no-cache" };
    }
    return response;
}
