/**
 * Node config
 */
var nodeConfig = {
    nodeName: "***dynamic-patch-next-gen",
    objectId: "alpha_user",
    userId: "_id",
    errorMessage: "Something went wrong!"
};

/**
 * Node outcomes
 */

var nodeOutcomes = {
    TRUE: "true",
    ERROR: "error"
};

/**
 * Array of attributes from the objectAttributes that will be used for Patch
 */

var attributesAllowList = {
    frIndexedDate2: "replace", // last login timestamp
    sn: "replace",
    givenName: "replace",
    frUnindexedString2: "add", // preferred login method
    telephoneNumber: "add",
    frIndexedString1: "add" // Secondary email address
};

/**
 * Patch the IDM user object
 * 
 * @param {objectAttributes} The objectAttributes array
 * @param {userId} The _id of the user
 */

function patchUser(objectAttributes, userId) {

    var requestBody = [];
    Object.keys(objectAttributes).forEach(function(objectAttributeKey) {
      if (Object.keys(attributesAllowList).includes(objectAttributeKey)) {
        logger.debug("Adding " + objectAttributeKey + " to request body with value " + objectAttributes.get(objectAttributeKey) + " and patch operation " + attributesAllowList[objectAttributeKey]);
        requestBody.push({
                operation: attributesAllowList[objectAttributeKey],
                field: "/" + objectAttributeKey,
                value: objectAttributes.get(objectAttributeKey)
            });
      	}	
    }
    );

    if (requestBody.length === 0) {
        logger.debug("Found no whitelisted attributes. Skipping patch.");
        return true;
    }
	var idmPatch;
    try {
        idmPatch = openidm.patch("managed/" + nodeConfig.objectId + "/" + userId, null, requestBody);
      	return true;
    } catch (e) {
        logger.error("Unable to call IDM endpoint. Exception: " + e);
      	nodeState.putShared("errorMessage", nodeConfig.errorMessage);
        return false;
    }
}

/**
 * Node entry point
 */

(function() {
    logger.debug("node executing");

    var userId;
    var objectAttributes = nodeState.getObject("objectAttributes");

    if (!objectAttributes) {
        logger.error("objectAttributes not found in node state.");
        action.goTo(nodeOutcomes.ERROR).withErrorMessage(nodeConfig.errorMessage);
        return;
    }

    if (!(userId = nodeState.get(nodeConfig.userId))) {
        logger.error("userId not found in node state.");
        action.goTo(nodeOutcomes.ERROR).withErrorMessage(nodeConfig.errorMessage);
        return;
    }
    action.goTo(patchUser(objectAttributes, userId) ? nodeOutcomes.TRUE : nodeOutcomes.ERROR)
})();