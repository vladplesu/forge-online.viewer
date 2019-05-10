function LoadNewModel(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}

LoadNewModel.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
LoadNewModel.prototype.constructor = LoadNewModel;

LoadNewModel.prototype.loadNewModel = async function(e) {
    try {
        e.preventDefault();
        const formData = new FormData(e.target);
        formData.append('loadNewModel', 'true');
        const res = await fetch('/api/forge/datamanagement/bucket/upload', {
            method: 'POST',
            body: formData
        });

        const obj = await res.json();
        const documentId = 'urn:' + obj.urn;

        Autodesk.Viewing.Document.load(
            documentId,
            this.onDocumentLoadSuccessBinded,
            this.onDocumentLoadFailureBinded
        );
    } catch (err) {
        console.log(err);
    }
};

LoadNewModel.prototype.onDocumentLoadSuccess = function(doc) {
    const viewables = Autodesk.Viewing.Document.getSubItemsWithProperties(
        doc.getRootItem(),
        { type: 'geometry' },
        true
    );

    if (viewables.length === 0) {
        console.log('Document contains no viewables');
        return;
    }

    const initViewable = viewables[0];
    const svfUrl = doc.getViewablePath(initViewable);
    const mat = new THREE.Matrix4();
    const loaderOptions = {
        placementTransform: mat,
        globalOffset: { x: 0, y: 0, z: 0 },
        sharedPropertyDbPath: doc.getPropertyDbPath()
    };
    this.viewer.loadModel(
        svfUrl,
        loaderOptions,
        this.onLoadModelSuccessBinded,
        this.onLoadModelErrorBinded
    );
};

LoadNewModel.prototype.onDocumentLoadFailure = function(viewerErrorCode) {
    console.error('onDocumentLoadFailure() - errorCode: ' + viewerErrorCode);
    $('MyViewerDiv')[0].innerHTML(
        '<p>Translation in progress... Please try refreshing the page.</p>'
    );
};

LoadNewModel.prototype.onLoadModelSuccess = function(model) {
    console.log('onLoadModelSuccess()!');
    console.log(model);
};

LoadNewModel.prototype.onLoadModelError = function(viewerErrorCode) {
    console.error('onLoadModelError() - errorCode: ' + viewerErrorCode);
};

LoadNewModel.prototype.load = function() {
    this.loadNewModelBinded = this.loadNewModel.bind(this);
    this.onDocumentLoadSuccessBinded = this.onDocumentLoadSuccess.bind(this);
    this.onDocumentLoadFailureBinded = this.onDocumentLoadFailure.bind(this);
    this.onLoadModelSuccessBinded = this.onLoadModelSuccess.bind(this);
    this.onLoadModelErrorBinded = this.onLoadModelError.bind(this);

    const $newModelForm = $('form');
    $newModelForm[0].addEventListener('submit', this.loadNewModelBinded);

    return true;
};

LoadNewModel.prototype.unload = function() {
    const $newModelForm = $('form');
    $newModelForm[0].removeEventListener('submit', this.loadNewModelBinded);

    this.loadNewModelBinded = null;
    this.onDocumentLoadSuccessBinded = null;
    this.onDocumentLoadFailureBinded = null;
    this.onLoadModelSuccessBinded = null;
    this.onLoadModelErrorBinded = null;

    return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension(
    'NewModelExtension',
    LoadNewModel
);
