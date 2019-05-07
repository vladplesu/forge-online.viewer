var viewer;
var options = {
    env: 'AutodeskProduction',
    api: 'derivativeV2', // TODO: for models uploaded to EMEA change this option to 'derivativeV2_EU'
    getAccessToken: getForgeToken
};
var documentId = 'urn:' + getUrlParameter('urn');

// Run this when the page is loaded
Autodesk.Viewing.Initializer(options, function onInitialized() {
    Autodesk.Viewing.Document.load(
        documentId,
        onDocumentLoadSuccess,
        onDocumentLoadFailure
    );
});

/**
 * Autodesk.Viewing.Document.load() success callback.
 * Proceeds with model initialization.
 */
function onDocumentLoadSuccess(doc) {
    // We could still make use of Document.getSubItemsWithProperties()
    // However, when using a ViewingApplication, we have access to the **bubble** attribute,
    // which references the root node of a graph that wraps each object from the Manifest JSON.
    const viewables = Autodesk.Viewing.Document.getSubItemsWithProperties(
        doc.getRootItem(),
        { type: 'geometry' },
        true
    );
    if (viewables.length === 0) {
        console.error('Document contains no viewables.');
        return;
    }

    // Choose any of the avialble viewables
    const initViewable = viewables[0];
    const svfUrl = doc.getViewablePath(initViewable);
    const mat = new THREE.Matrix4();
    const modelOptions = {
        placementTransform: mat,
        globalOffset: { x: 0, y: 0, z: 0 },
        sharedPropertyDbPath: doc.getPropertyDbPath()
    };

    const viewerDiv = document.getElementById('MyViewerDiv');
    const config = {
        extensions: ['NewModelExtension', 'QuantitiesExtension']
    };
    viewer = new Autodesk.Viewing.Private.GuiViewer3D(viewerDiv, config);
    viewer.start(svfUrl, modelOptions, onLoadModelSuccess, onLoadModelError);
}

// Get Query string from URL,
// we will use this to get the value of 'urn' from URL
function getUrlParameter(name) {
    name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null
        ? ''
        : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Get public access token for read only,
// using ajax to access route /api/forge/oauth/public in the background
function getForgeToken(callback) {
    jQuery.ajax({
        url: '/api/forge/oauth/public',
        success: function(res) {
            callback(res.access_token, res.expires_in);
        }
    });
}

/**
 * viewerApp.loadDocument() failuire callback.
 */
function onDocumentLoadFailure(viewerErrorCode) {
    console.error('onDocumentLoadFailure() - errorCode:' + viewerErrorCode);
    jQuery('#MyViewerDiv').html(
        '<p>Translation in progress... Please try refreshing the page.</p>'
    );
}

/**
 * viewerApp.selectItem() success callback.
 * Invoked after the model's SVF has been initially loaded.
 * It may trigger before any geometry has been downloaded and displayed on-screen.
 */
function onLoadModelSuccess(model) {
    console.log('onLoadModelSuccess()!');
    console.log(model);
}

/**
 * viewerApp.selectItem() failure callback.
 * Invoked when there's an error fetching the SVF file.
 */
function onLoadModelError(viewerErrorCode) {
    console.error('onLoadModelError() - errorCode:' + viewerErrorCode);
}
