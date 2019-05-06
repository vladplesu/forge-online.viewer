function QuantitiesList(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}

QuantitiesList.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
QuantitiesList.prototype.constructor = QuantitiesList;

QuantitiesList.prototype.onGeometryLoadEvent = function(event) {
    console.log('The geometry has been loaded: ' + event);
    const quantityPromise = this.viewer.model
        .getPropertyDb()
        .executeUserFunction(userFunction);

    quantityPromise
        .then(function(retValue) {
            console.log(retValue);
        })
        .catch(err => console.log(err));
};

QuantitiesList.prototype.load = function() {
    // console.log(
    //     'This is when the extension is loaded: ' +
    //         this.viewer +
    //         '\n======================================'
    this.onGeometryLoadBinded = this.onGeometryLoadEvent.bind(this);
    this.viewer.addEventListener(
        Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
        this.onGeometryLoadBinded
    );
    return true;
};

QuantitiesList.prototype.unload = function() {
    this.viewer.removeEventListener(
        Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
        this.onGeometryLoadBinded
    );
    this.onGeometryLoadBinded = null;
    return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension(
    'QuantitiesExtension',
    QuantitiesList
);

function userFunction(pdb) {
    let totalElements = [];
    pdb.enumObjects(function(dbId) {
        const objProps = pdb.getObjectProperties(dbId, [
            'Material',
            'Volume',
            'SDEV_PhysicalCode'
        ]);

        if (objProps && objProps.properties) {
            totalElements.push(objProps);
        }
    });

    return totalElements;
}
