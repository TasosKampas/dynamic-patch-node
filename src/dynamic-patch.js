/**
 * Node config
 */
var nodeConfig = {
    nodeName: "***dynamic-patch-node",
    objectId: "alpha_user",
    tenantFqdnEsv: "esv.tenant.fqdn",
    accessTokenStateField: "idmAccessToken",
    userId: "_id"
};

/**
 * Node imports
 */

var javaImports = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
  	java.lang.String
);

/**
 * Node outcomes
 */

var nodeOutcomes = {
    TRUE: "true",
    ERROR: "error"
};

/**
 * Node Logger
 */

var nodeLogger = {
    debug: function(message) {
        logger.message("***" + nodeConfig.nodeName + " " + message);
    },
    warning: function(message) {
        logger.warning("***" + nodeConfig.nodeName + " " + message);
    },
    error: function(message) {
        logger.error("***" + nodeConfig.nodeName + " " + message);
    }
};

/**
 * Array of attributes from the objectAttributes that will be used for Patch
 */

var attributesAllowList = {
    frIndexedDate2: "replace",
    sn: "replace",
    givenName: "replace",
    frUnindexedString2: "replace",
    telephoneNumber: "replace"
};


/**
 * Log an HTTP response
 * 
 * @param {Response} HTTP response object
 */

function logResponse(response) {
    nodeLogger.debug("Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

/**
 * Patch the IDM user object
 * 
 * @param {objectAttributes} The objectAttributes array
 * @param {id} The _id of the user
 * @param {accessToken} The IDM access token
 * @param {tenantFqdn} Tenant's FQDN
 */

function patchUser(objectAttributes, id, accessToken, tenantFqdn) {

    var response;
    var idmEndpoint = "https://".concat(tenantFqdn).concat("/openidm/managed/").concat(nodeConfig.objectId).concat("/").concat(id);
    nodeLogger.debug("Calling: " + idmEndpoint);

    var requestBody = [];
    nodeLogger.debug("Found objectAttributes: " + objectAttributes);
    //Object.keys(attributesAllowList);
    Object.keys(objectAttributes).forEach(function(objectAttributeKey) {
        if (Object.keys(attributesAllowList).includes(objectAttributeKey)) {
            nodeLogger.debug("Adding " + objectAttributeKey + " to request body with value " + objectAttributes.get(objectAttributeKey) + " and patch operation " + attributesAllowList[objectAttributeKey]);
            requestBody.push({
                operation: attributesAllowList[objectAttributeKey],
                field: "/" + objectAttributeKey,
                value: objectAttributes.get(objectAttributeKey)
            });
        }
    });
    if (requestBody.length === 0) {
        nodeLogger.debug("Found no whitelisted attributes. Skipping patch.");
        return true;
    }

    try {
        var request = new org.forgerock.http.protocol.Request();
        request.setMethod('PATCH');
        request.setUri(idmEndpoint);
        request.getHeaders().add("Authorization", "Bearer " + accessToken);
        request.getEntity().setJson(requestBody);
        response = httpClient.send(request).get();
    } catch (e) {
        nodeLogger.error(" Unable to call IDM endpoint: " + idmEndpoint + " Exception: " + e);
        return null;
    }
    logResponse(response);

    if (response.getStatus().getCode() === 200) {
        nodeLogger.error("User patched - 200 OK");
        return true;
    } else {
        nodeLogger.error("Unexpected response");
        return null;
    }
}

/**
 * Node entry point
 */

(function() {
    nodeLogger.debug("node executing");

    var accessToken;
    var userId;
    var tenantFqdn;
    var objectAttributes = sharedState.get("objectAttributes");


    if (!objectAttributes) {
        nodeLogger.error("objectAttributes not found in node state");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).withErrorMessage("Intenal Server error").build();
    } else if (!(userId = nodeState.get(nodeConfig.userId))) {
        nodeLogger.error(nodeConfig.userId + "not found in node state");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).withErrorMessage("Intenal Server error").build();
    } else if (!(accessToken = nodeState.get(nodeConfig.accessTokenStateField))) {
        nodeLogger.error("Unable to retrieve Access Token from nodeState");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).withErrorMessage("Intenal Server error").build();
    } else if (!(tenantFqdn = systemEnv.getProperty(nodeConfig.tenantFqdnEsv))) {
        nodeLogger.error("Couldn't get ESV " + nodeConfig.tenantFqdnEsv);
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).withErrorMessage("Intenal Server error").build();
    } else if (!(patchUser(objectAttributes, userId.asString(), accessToken.asString(), tenantFqdn))) {
        nodeLogger.error("Error patching user");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).withErrorMessage("Intenal Server error").build();
    } else {
        action = javaImports.Action.goTo(nodeOutcomes.TRUE).build();
    }
})();