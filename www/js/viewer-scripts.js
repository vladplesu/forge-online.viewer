var viewerApp;
var options = {
    env: 'AutodeskProduction',
    api: 'derivativeV2', // TODO: for models uploaded to EMEA change this option to 'derivativeV2_EU'
    getAccessToken: getForgeToken
};
var documentId = 'urn:' + getUrlParameter('urn');

// Run this when the page is loaded
Autodesk.Viewing.Initializer(options, function onInitialized() {
    viewerApp = new Autodesk.Viewing.ViewingApplication('MyViewerDiv');
    const config3d = {
        extensions: ['QuantitiesExtension']
    };
    viewerApp.registerViewer(
        viewerApp.k3D,
        Autodesk.Viewing.Private.GuiViewer3D,
        config3d
    );
    viewerApp.loadDocument(
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
    var viewables = viewerApp.bubble.search({ type: 'geometry' });
    if (viewables.length === 0) {
        console.error('Document contains no viewables.');
        return;
    }

    // Choose any of the avialble viewables
    viewerApp.selectItem(viewables[0].data, onItemLoadSuccess, onItemLoadFail);
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
function onItemLoadSuccess(viewer, item) {
    console.log('onItemLoadSuccess()!');
    // console.log(viewer);
    // console.log(item);

    // Congratulations! The viewer is now ready to be used.
    // console.log(
    //     'Viewers are equal: ' + (viewer === viewerApp.getCurrentViewer())
    // );
}

/**
 * viewerApp.selectItem() failure callback.
 * Invoked when there's an error fetching the SVF file.
 */
function onItemLoadFail(viewerErrorCode) {
    console.error('onLoadModelError() - errorCode:' + viewerErrorCode);
    jQuery('#MyViewerDiv').html(
        '<p>There is an error fetching the translated SVF file. Please try refreshing the page.</p>'
    );
}
